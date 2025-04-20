import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { EditorComponent } from 'src/renderer/app/components/editor/editor.component';
import { EnvironmentsService } from 'src/renderer/app/services/environments.service';
import { UIService } from 'src/renderer/app/services/ui.service';

// Constants
const INDENT_SIZE = 2;

@Component({
  selector: 'app-json-config-modal',
  templateUrl: './json-config-modal.component.html',
  styleUrls: ['./json-config-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorComponent]
})
export class JsonConfigModalComponent implements OnInit, OnDestroy {
  public jsonForm: FormGroup;
  public bodyEditorConfig = {
    options: {
      contextmenu: false,
      minimap: { enabled: false },
      lineNumbers: 'on',
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      renderIndentGuides: true,
      scrollBeyondLastLine: false,
      scrollbar: {
        horizontal: 'auto',
        vertical: 'auto'
      }
    },
    mode: 'json'
  };
  public errorMessage$ = new BehaviorSubject<string | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private uiService: UIService,
    private formBuilder: FormBuilder,
    private environmentsService: EnvironmentsService
  ) {}

  ngOnInit() {
    this.initForm();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public close() {
    this.uiService.closeModal('jsonConfig');
  }

  public formatJSON() {
    const jsonBody = this.jsonForm.get('body').value;
    if (!jsonBody) {
      return;
    }

    try {
      this.jsonForm
        .get('body')
        .setValue(JSON.stringify(JSON.parse(jsonBody), undefined, INDENT_SIZE));
      this.errorMessage$.next(null);
    } catch (_error) {
      this.errorMessage$.next('Invalid JSON format');
    }
  }

  public submit() {
    const jsonBody = this.jsonForm.get('body').value;
    if (!jsonBody) {
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonBody);
      this.environmentsService.importToCloud(parsedJson).subscribe({
        next: () => {
          // reset
          this.jsonForm.get('body').setValue('');
          this.uiService.closeModal('jsonConfig');
        }
      });
    } catch (_error) {
      this.errorMessage$.next('Invalid JSON format');
    }
  }

  private initForm() {
    this.jsonForm = this.formBuilder.group({
      body: ['']
    });
  }
}
