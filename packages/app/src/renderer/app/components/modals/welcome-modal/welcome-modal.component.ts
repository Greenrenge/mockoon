import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { SvgComponent } from 'src/renderer/app/components/svg/svg.component';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from 'src/renderer/app/interfaces/user-service.interface';
import { SettingsService } from 'src/renderer/app/services/settings.service';
import { TourService } from 'src/renderer/app/services/tour.service';
import { UIService } from 'src/renderer/app/services/ui.service';
import { Config } from 'src/renderer/config';

@Component({
  selector: 'app-welcome-modal',
  templateUrl: './welcome-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SvgComponent]
})
export class WelcomeModalComponent {
  public isWeb = Config.isWeb;

  constructor(
    private settingsService: SettingsService,
    private uiService: UIService,
    private tourService: TourService,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService
  ) {}

  public close(takeTour: boolean) {
    this.uiService.closeModal('welcome');
    this.settingsService.updateSettings({ welcomeShown: true });

    if (this.isWeb) {
      this.userService.webAuthHandler().subscribe();
    }

    // currently disabled on web
    if (takeTour) {
      this.tourService.start();
    }
  }
}
