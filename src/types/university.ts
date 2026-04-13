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
  type?: string;
  [key: string]: any;
}

export interface StudyTip {
  id: string;
  title: string;
  description: string;
  category?: string;
  [key: string]: any;
}
