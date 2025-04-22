import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  Subject,
  filter,
  finalize,
  map,
  takeUntil
} from 'rxjs';
import { SpinnerComponent } from 'src/renderer/app/components/spinner.component';
import { SvgComponent } from 'src/renderer/app/components/svg/svg.component';
import { UIService } from 'src/renderer/app/services/ui.service';
import { UserServiceSupabase } from 'src/renderer/app/services/user.service.supabase';
import { Store } from 'src/renderer/app/stores/store';
import { Config } from 'src/renderer/config';

@Component({
  selector: 'app-yaml-upload-modal',
  templateUrl: './yaml-upload-modal.component.html',
  styleUrls: ['./yaml-upload-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent, SvgComponent]
})
export class YamlUploadModalComponent implements OnDestroy {
  public uploadForm: FormGroup;
  public isLoading$ = new BehaviorSubject<boolean>(false);
  public errorMessage$ = new BehaviorSubject<string | null>(null);
  public selectedFileName$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();
  private allowedFileTypes = ['.yml', '.yaml'];

  constructor(
    private uiService: UIService,
    private userService: UserServiceSupabase,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private store: Store
  ) {
    this.initForm();
  }

  public onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const fileExtension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf('.'));

      if (this.allowedFileTypes.includes(fileExtension)) {
        this.uploadForm.patchValue({ file });
        this.selectedFileName$.next(file.name);
        this.errorMessage$.next(null);
      } else {
        this.errorMessage$.next('Please select a YAML file (.yml or .yaml)');
        this.uploadForm.patchValue({ file: null });
        this.selectedFileName$.next(null);
      }
    }
  }

  public onSubmit() {
    if (this.uploadForm.valid) {
      const file = this.uploadForm.get('file').value;
      const serverUrl = this.getServerUrl();

      const formData = new FormData();
      formData.append('file', file);

      this.isLoading$.next(true);
      this.errorMessage$.next(null);
      this.userService
        .getIdToken()
        .pipe(
          filter((token) => !!token),
          map((token) =>
            this.http
              .put(`${serverUrl}/import-open-api`, formData, {
                headers: { Authorization: `Bearer ${token}` }
              })
              .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
              )
              .subscribe({
                next: () => {
                  this.close();
                },
                error: (error) => {
                  this.errorMessage$.next(
                    error.message || 'Failed to upload file'
                  );
                }
              })
          )
        )
        .subscribe();
    }
  }

  public close() {
    this.uiService.closeModal('yamlUpload');
  }

  public ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.uploadForm = this.formBuilder.group({
      file: [null, Validators.required]
    });
  }

  private getServerUrl(): string {
    // You will implement this method to get the URL from environment
    return `${Config.apiURL}upload`;
  }
}
