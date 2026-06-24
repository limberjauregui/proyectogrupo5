export interface PageVM<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
