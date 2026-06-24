import { Observable, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { PageVM } from '../models/page-vm.model';

export abstract class BaseReactivePage<T> {

  protected vm$<R>(source$: Observable<R>): Observable<PageVM<R>> {
    return source$.pipe(

      map(data => ({
        data,
        loading: false,
        error: null
      })),

      startWith({
        data: null as unknown as R,
        loading: true,
        error: null
      }),

      catchError(err =>
        of({
          data: null as unknown as R,
          loading: false,
          error: err?.message ?? 'Unknown error'
        })
      )
    );
  }
}
