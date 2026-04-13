export interface University {
  name: string;
  abbreviation?: string;
  province?: string;
  logo?: string;
}

export interface StudyResource {
  id: string;
  title: string;
  description?: string;
  category: string;
  university?: string;
  subject?: string;
  url?: string;
}
