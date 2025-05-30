import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Plans } from '@mockoon/cloud';
import {
  EMPTY,
  Observable,
  catchError,
  filter,
  first,
  forkJoin,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';
import { DeployInstanceWithPort } from 'src/renderer/app/models/store.model';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { RemoteConfigService } from 'src/renderer/app/services/remote-config.service';
import {
  addDeployInstanceAction,
  removeDeployInstanceAction,
  updateDeployInstanceAction,
  updateDeployInstancesAction,
  updateEnvironmentStatusAction,
  updateUserAction
} from 'src/renderer/app/stores/actions';
import { Store } from 'src/renderer/app/stores/store';
import { Config } from 'src/renderer/config';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from '../interfaces/user-service.interface';

@Injectable({ providedIn: 'root' })
export class DeployService {
  constructor(
    private store: Store,
    private remoteConfig: RemoteConfigService,
    private httpClient: HttpClient,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService,
    private appConfig: AppConfigService
  ) {}

  public init() {
    return this.userService
      .idTokenChanges()
      .pipe(switchMap(() => this.getInstances()));
  }

  /**
   * Get the list of deploy instances
   *
   * @returns
   */
  public getInstances() {
    return forkJoin([
      this.store.select('user').pipe(
        filter((user) => !!user),
        first()
      ),
      this.userService.getIdToken()
    ]).pipe(
      switchMap(([user, token]) => {
        if (user?.plan !== Plans.FREE) {
          return this.httpClient.get<DeployInstanceWithPort[]>(
            `${this.appConfig.getConfig().apiURL}deployments`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        }

        return of([]);
      }),
      tap((instances: DeployInstanceWithPort[]) => {
        this.store.update(updateDeployInstancesAction(instances));
      }),
      catchError(() => EMPTY)
    );
  }

  /**
   * Check if a subdomain is available
   *
   * @returns
   */
  public checkSubdomainAvailability(
    subdomain: string,
    environmentUuid?: string
  ) {
    return forkJoin([
      this.userService.getIdToken(),
      this.remoteConfig.get('deployUrl').pipe(
        filter((deployUrl) => !!deployUrl),
        first()
      )
    ]).pipe(
      switchMap(([token, deployUrl]) =>
        this.httpClient
          .post(
            `${deployUrl}/deployments/subdomain`,
            {
              subdomain,
              environmentUuid
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )
          .pipe(
            map(() => true),
            catchError(() => of(false))
          )
      )
    );
  }

  /**
   * Check if a port is available
   *
   * @returns
   */
  public checkPortAvailability(port: number, environmentUuid?: string) {
    return forkJoin([
      this.userService.getIdToken(),
      this.remoteConfig.get('deployUrl').pipe(
        filter((deployUrl) => !!deployUrl),
        first()
      )
    ]).pipe(
      switchMap(([token, deployUrl]) =>
        this.httpClient
          .post(
            `${deployUrl}/deployments/port`,
            {
              port,
              environmentUuid
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )
          .pipe(
            map(() => true),
            catchError(() => of(false))
          )
      )
    );
  }

  /**
   * Deploy an environment to the cloud
   *
   * @returns
   */
  public deploy(
    environmentUuid: string,
    options: Pick<DeployInstanceWithPort, 'visibility' | 'subdomain' | 'port'>,
    redeploy = false
  ) {
    const environment = this.store.getEnvironmentByUUID(environmentUuid);
    const instances = this.store.get('deployInstances');

    return forkJoin([
      this.userService.getIdToken(),
      this.remoteConfig.get('deployUrl').pipe(
        filter((deployUrl) => !!deployUrl),
        first()
      )
    ]).pipe(
      switchMap(([token, deployUrl]) => {
        const user = this.store.get('user');

        if (
          user &&
          user.plan !== Plans.FREE &&
          // can deploy if the user has not reached the quota or if the environment is already deployed (redeploy)
          (user.deployInstancesQuotaUsed < user.deployInstancesQuota ||
            !!instances.find(
              (instance) => instance.environmentUuid === environmentUuid
            ))
        ) {
          return this.httpClient.post<DeployInstanceWithPort>(
            `${deployUrl}/deployments`,
            {
              environment,
              ...options,
              version: Config.appVersion
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        }

        return EMPTY;
      }),
      tap((instance) => {
        if (redeploy) {
          this.store.update(
            updateDeployInstanceAction(instance.environmentUuid, instance)
          );
        } else {
          this.store.update(addDeployInstanceAction(instance));

          this.store.update(
            updateUserAction({
              deployInstancesQuotaUsed:
                this.store.get('user').deployInstancesQuotaUsed + 1
            })
          );
        }
      })
    );
  }

  /**
   * Do a quick redeploy of an instance based on its previous configuration
   *
   * @param environmentUuid
   * @returns
   */
  public quickRedeploy(
    environmentUuid: string
  ): Observable<DeployInstanceWithPort> {
    this.store.update(
      updateEnvironmentStatusAction({ redeploying: true }, environmentUuid)
    );
    const instances = this.store.get('deployInstances');
    const existingInstance = instances.find(
      (instance) => instance.environmentUuid === environmentUuid
    );

    if (!existingInstance) {
      return EMPTY;
    }

    return this.deploy(
      environmentUuid,
      {
        subdomain: existingInstance.subdomain,
        port: existingInstance.port,
        visibility: existingInstance.visibility
      },
      true
    ).pipe(tap());
  }

  /**
   * Stop an instance
   *
   * @returns
   */
  public stop(environmentUuid: string) {
    return forkJoin([
      this.userService.getIdToken(),
      this.remoteConfig.get('deployUrl').pipe(
        filter((deployUrl) => !!deployUrl),
        first()
      )
    ]).pipe(
      switchMap(([token, deployUrl]) => {
        return this.httpClient.delete<DeployInstanceWithPort>(
          `${deployUrl}/deployments/${environmentUuid}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }),
      tap(() => {
        this.store.update(removeDeployInstanceAction(environmentUuid));

        this.store.update(
          updateUserAction({
            deployInstancesQuotaUsed:
              this.store.get('user').deployInstancesQuotaUsed - 1
          })
        );
      })
    );
  }
}
