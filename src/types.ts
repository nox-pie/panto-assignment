export interface Repository {
  id: number;
  name: string;
  autoReview: boolean;
}

export interface User {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}