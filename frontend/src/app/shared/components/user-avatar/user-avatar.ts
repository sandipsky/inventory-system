import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Avatar, Icon } from '@lumen-ui/angular';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * A user's profile picture, or their initials when there is none. Pictures need the auth
 * header, so they load as blobs instead of an `<img src>`; each object URL is revoked once
 * the picture changes or the avatar goes away.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Icon],
  selector: 'app-user-avatar',
  styles: `
    :host {
      display: inline-flex;
    }

    // Same look as the profile menu's placeholder.
    .placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--bg-dark);
      color: var(--text-tertiary);

      l-icon {
        display: inline-flex;
      }
    }
  `,
  template: `
    @if (preview() || picture() || name()) {
      <l-avatar [imageUrl]="preview() || picture()" [name]="name()" [size]="size()" />
    } @else {
      <!-- No picture and no name yet (a new user), so no initials either. -->
      <span class="placeholder" aria-hidden="true" [style.width]="size()" [style.height]="size()">
        <l-icon name="user" color="inherit" [size]="iconSize()" />
      </span>
    }
  `,
})
export class UserAvatar {
  /** Server-relative `image_url`, e.g. `/uploads/users/<uuid>.png`. */
  readonly path = input<string | null>(null);
  /** An object URL shown instead of `path`, e.g. a picture picked but not saved yet. */
  readonly preview = input<string | null | undefined>(null);
  readonly name = input('');
  readonly size = input('32px');

  private readonly http = inject(HttpClient);

  protected readonly iconSize = computed(() => Math.round(parseFloat(this.size()) / 2) || 16);

  protected readonly picture = toSignal(
    toObservable(this.path).pipe(switchMap(path => (path ? this.load(path) : of(null)))),
    { initialValue: null },
  );

  private load(path: string): Observable<string | null> {
    return this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' }).pipe(
      // Never completes, so the URL lives until switchMap moves on or the avatar is destroyed.
      switchMap(
        blob =>
          new Observable<string>(subscriber => {
            const url = URL.createObjectURL(blob);
            subscriber.next(url);
            return () => URL.revokeObjectURL(url);
          }),
      ),
      // A missing picture falls back to the initials.
      catchError(() => of(null)),
    );
  }
}
