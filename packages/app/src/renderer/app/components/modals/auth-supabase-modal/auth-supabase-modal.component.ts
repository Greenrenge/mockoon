import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Subject,
  catchError,
  finalize,
  takeUntil,
  tap
} from 'rxjs';
import { UIService } from 'src/renderer/app/services/ui.service';
import { UserServiceSupabase } from 'src/renderer/app/services/user.service.supabase';

@Component({
  selector: 'app-auth-supabase-modal',
  templateUrl: './auth-supabase-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthSupabaseModalComponent implements OnDestroy {
  public isLoading$ = new BehaviorSubject<boolean>(false);
  public isSuccess$ = new BehaviorSubject<boolean>(false);
  public errorMessage$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();

  constructor(
    private uiService: UIService,
    private userService: UserServiceSupabase
  ) {}

  public onSubmit(): void {
    this.isLoading$.next(true);
    this.errorMessage$.next(null);

    this.userService
      .signInWithOAuth('github')
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
    this.uiService.closeModal('authSupabase');
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
