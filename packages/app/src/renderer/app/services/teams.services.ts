/* eslint-disable no-console */
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, Injector, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  from,
  interval,
  of
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from 'src/renderer/app/interfaces/user-service.interface';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { EnvironmentsService } from 'src/renderer/app/services/environments.service';
import { MainApiService } from 'src/renderer/app/services/main-api.service';
import { SettingsService } from 'src/renderer/app/services/settings.service';
import { SyncService } from 'src/renderer/app/services/sync.service';

// Define types for the API response
export interface AppSubscription {
  trial: boolean;
  provider: string;
  frequency: string;
  createdOn: Date;
  renewOn: Date;
  portalEnabled: boolean;
  cancellationScheduled: boolean;
  pastDue: boolean;
  subscriptionId: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
}

export interface MeResponse {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  teams: Team[];
  plan: string;
  teamId?: string;
  teamRole?: string;
  deployInstancesQuota: number;
  deployInstancesQuotaUsed: number;
  cloudSyncItemsQuota: number;
  cloudSyncItemsQuotaUsed: number;
  cloudSyncSizeQuota: number;
  cloudSyncHighestMajorVersion: number;
  templatesQuota: number;
  templatesQuotaUsed: number;
  nextQuotaResetOn: number;
  subscription: AppSubscription;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamsService implements OnDestroy {
  // Polling interval for team data (5 minutes)
  private readonly POLL_INTERVAL = 5 * 60 * 1000;

  // Store team data
  private teamsData: MeResponse | null = null;

  // Subject for current team ID
  private currentTeamSubject = new BehaviorSubject<string | null>(null);

  // Subscriptions to clean up
  private pollSubscription: Subscription | null = null;

  constructor(
    @Inject(HttpClient) private httpClient: HttpClient,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService,
    private appConfig: AppConfigService,
    private location: Location,
    private mainApiService: MainApiService,
    private injector: Injector
  ) {
    // Start polling for team data
    this.startPolling();

    // Check for team ID in URL when initializing
    this.syncFromUrlQueryString();
  }

  public init() {
    return from(this.userService.idTokenChanges()).pipe(
      distinctUntilChanged(),
      filter((v) => !!v),
      switchMap(() => this.fetchTeamData()),
      catchError((err) => {
        console.error('Error fetching initial team data:', err);

        return of(null);
      })
    );
  }

  /**
   * Get the list of teams the user has access to
   */
  public getMyTeamList(): Observable<Team[]> {
    if (this.teamsData?.teams) {
      return of(this.teamsData.teams);
    }

    return this.fetchTeamData().pipe(
      filter((data) => !!data),
      map((data) => data.teams || [])
    );
  }

  /**
   * Select a team by ID (validate and update the currently active team)
   * @param teamId - ID of the team to select
   * @returns Observable that emits true if selection was successful
   */
  public selectTeam(teamId: string): Observable<boolean> {
    // Validate the team ID is accessible to this user
    const isValidTeam =
      !teamId ||
      (this.teamsData?.teams || []).some((team) => team.id === teamId);

    if (!isValidTeam) {
      console.warn(
        `Team ID ${teamId} is not valid or accessible to the current user`
      );

      return of(false);
    }

    // Update the URL query parameter to reflect the selected team
    this.updateUrlQueryParam(teamId);

    // Reinitialize the application for the new team context
    this.reInitializeApp(teamId);

    return of(true);
  }

  /**
   * Get an observable of the current team ID
   * @returns Observable that emits the current team ID
   */
  public getCurrentTeam(): Observable<string> {
    return this.currentTeamSubject.asObservable().pipe(
      // Filter out null values, convert to empty string if needed
      map((teamId) => teamId || '')
    );
  }

  /**
   * Get the currently selected team object
   * @returns Observable that emits the current team object or null
   */
  public getCurrentTeamDetails(): Observable<Team | null> {
    return this.currentTeamSubject.pipe(
      filter((teamId) => !!teamId),
      switchMap((teamId) => {
        if (!this.teamsData?.teams) {
          return this.fetchTeamData().pipe(
            map(
              (data) => data?.teams.find((team) => team.id === teamId) || null
            )
          );
        }

        return of(
          this.teamsData.teams.find((team) => team.id === teamId) || null
        );
      })
    );
  }

  /**
   * Clean up subscriptions on service destroy
   */
  ngOnDestroy(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }
  /**
   * Start periodic polling for team data (every 5 minutes)
   */
  private startPolling(): void {
    this.pollSubscription = interval(this.POLL_INTERVAL)
      .pipe(
        // Start with immediate execution
        switchMap(() => this.fetchTeamData()),
        catchError((err) => {
          console.error('Error polling team data:', err);

          return of(null);
        })
      )
      .subscribe();

    // Fetch initial data without waiting for the interval
    this.fetchTeamData().subscribe();
  }

  /**
   * Check for team ID in the URL query string and select it if present
   */
  private syncFromUrlQueryString(): void {
    // Only proceed if we're running in the browser (web app)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const teamIdFromUrl = urlParams.get('teamId');

      if (teamIdFromUrl) {
        // Select the team from URL, if valid
        // The selectTeam method will validate if this is an accessible team ID
        this.selectTeam(teamIdFromUrl).subscribe();
      }
    }
  }

  /**
   * Fetch team data from the API
   */
  private fetchTeamData(): Observable<MeResponse | null> {
    const url = `${this.appConfig.getConfig().apiURL}tenants/me`;

    return from(this.userService.getIdToken()).pipe(
      filter((token) => !!token),
      switchMap((token) => {
        const headers = token
          ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
          : undefined;

        return this.httpClient
          .get<MeResponse>(url, {
            headers
          })
          .pipe(
            tap((response) => {
              this.teamsData = response;

              // If no team is currently selected but user has a teamId, select it
              if (!this.currentTeamSubject.value && response.teamId) {
                this.selectTeam(response.teamId);
              }

              // Sync team ID from URL query string
              this.syncFromUrlQueryString();
            }),
            catchError((err) => {
              console.error('Error fetching team data:', err);

              return of(null);
            })
          );
      })
    );
  }

  /**
   * Update the URL query parameter to reflect the currently selected team
   * @param teamId - ID of the selected team
   */
  private updateUrlQueryParam(teamId: string): void {
    const urlTree = this.location.prepareExternalUrl(this.location.path());
    const newUrl = this.appendOrUpdateQueryParam(urlTree, 'teamId', teamId);

    // Update the browser's URL without reloading the page
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Append or update a query parameter in the URL
   * @param url - The original URL
   * @param param - The query parameter name
   * @param value - The query parameter value
   * @returns The updated URL
   */
  private appendOrUpdateQueryParam(
    url: string,
    param: string,
    value: string
  ): string {
    const urlObj = new URL(url, window.location.origin);

    // Update the query parameter
    urlObj.searchParams.set(param, value);

    return urlObj.toString().replace(window.location.origin, '');
  }

  /**
   * Reinitialize the application services
   * Call this when switching teams to ensure all services load the correct data
   */
  private reInitializeApp(teamId: string): void {
    // Update the current team subject first
    this.currentTeamSubject.next(teamId);

    try {
      // Get required services
      const environmentsService = this.injector.get(EnvironmentsService);
      const syncService = this.injector.get(SyncService);
      const settingsService = this.injector.get(SettingsService);

      console.log(`Reinitializing application for team: ${teamId}`);

      // First disconnect sync service
      syncService?.disconnect();

      // Reload settings and environments
      settingsService?.loadSettings().subscribe();
      environmentsService?.loadEnvironments().subscribe();

      // Reconnect sync service
      syncService?.init().subscribe();

      console.log('Application reinitialization complete');
    } catch (error) {
      console.error('Error reinitializing application:', error);
    }
  }
}
