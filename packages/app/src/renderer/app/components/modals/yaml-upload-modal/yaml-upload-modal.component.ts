import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';
import { SpinnerComponent } from 'src/renderer/app/components/spinner.component';
import { ImportExportOpenAPIService } from 'src/renderer/app/services/import-export-openapi.service';
import { UIService } from 'src/renderer/app/services/ui.service';

@Component({
  selector: 'app-yaml-upload-modal',
  templateUrl: './yaml-upload-modal.component.html',
  styleUrls: ['./yaml-upload-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent]
})
export class YamlUploadModalComponent implements OnDestroy {
  public uploadForm: FormGroup;
  public isLoading$ = new BehaviorSubject<boolean>(false);
  public errorMessage$ = new BehaviorSubject<string | null>(null);
  public selectedFileName$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();
  private allowedFileTypes = ['.yml', '.yaml', '.zip'];

  constructor(
    private uiService: UIService,
    private formBuilder: FormBuilder,
    private importExportOpenAPIService: ImportExportOpenAPIService
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
      const formData = new FormData();
      formData.append('file', file);

      this.isLoading$.next(true);
      this.errorMessage$.next(null);

      this.importExportOpenAPIService
        .uploadOpenAPIFile(formData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isLoading$.next(false);
          })
        )
        .subscribe({
          next: () => {
            this.close();
          },
          error: (error) => {
            this.errorMessage$.next(
              error?.error?.message || error?.message || 'Failed to upload file'
            );
          }
        });
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
}
