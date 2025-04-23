import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Subject,
  catchError,
  finalize,
  takeUntil,
  tap
} from 'rxjs';
import { SpinnerComponent } from 'src/renderer/app/components/spinner.component';
import { SvgComponent } from 'src/renderer/app/components/svg/svg.component';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from 'src/renderer/app/interfaces/user-service.interface';
import { UIService } from 'src/renderer/app/services/ui.service';

@Component({
  selector: 'app-auth-custom-modal',
  templateUrl: './auth-custom-modal.component.html',
  styleUrls: ['./auth-custom-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, SpinnerComponent, SvgComponent]
})
export class AuthCustomModalComponent implements OnDestroy {
  public providers: string[] = ['github', 'keycloak'];
  public isLoading$ = new BehaviorSubject<boolean>(false);
  public isSuccess$ = new BehaviorSubject<boolean>(false);
  public errorMessage$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();

  constructor(
    private uiService: UIService,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService
  ) {
    this.providers = this.userService.getProviderTokens();
  }

  public onSubmit(provider: string): void {
    this.isLoading$.next(true);
    this.errorMessage$.next(null);

    this.userService
      .signInWithProvider(provider)
      .pipe(
        tap(() => {
          this.isLoading$.next(false);
          this.isSuccess$.next(true);
        }),
        catchError((error) => {
          this.isLoading$.next(false);
          this.showError(error);

          return EMPTY;
        }),
        finalize(() => {
          this.isLoading$.next(false);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  public close() {
    this.isLoading$.next(false);
    this.isSuccess$.next(false);
    this.errorMessage$.next(null);
    this.uiService.closeModal('authCustomProvider');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private showError(error: any): void {
    const message =
      error instanceof Error ? error.message : 'An error occurred during login';
    this.errorMessage$.next(message);
  }
}
