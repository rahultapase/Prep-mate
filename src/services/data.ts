// Typed wrappers around the local data API (replaces the old Firestore calls)
import { API_ENDPOINTS, apiFetch } from '../config/api';

export interface Profile {
  fullName: string;
  graduation: string;
  year: string;
  branch: string;
  experience: string;
  role: string;
}

export interface StoredInterview<TFeedback = Record<string, unknown>> {
  id: string;
  feedback: TFeedback;
  interviewType: string;
  questions: string[];
  answers: string[];
  userInputs: Record<string, unknown>;
  timestamp: string;
  user: string;
}

export interface NewInterview {
  feedback: Record<string, unknown>;
  interviewType: string;
  questions: string[];
  answers: string[];
  userInputs: Record<string, unknown>;
}

export interface RatingInput {
  interviewExperience: number;
  aiQuestionQuality: number;
  userInterface: number;
  overallSatisfaction: number;
  experienceText: string;
}

export const getProfile = () =>
  apiFetch<{ exists: boolean; profile: Profile }>(API_ENDPOINTS.PROFILE);

export const saveProfile = (profile: Profile) =>
  apiFetch<{ exists: boolean; profile: Profile }>(API_ENDPOINTS.PROFILE, { method: 'PUT', body: profile });

export const listInterviews = async <TFeedback = Record<string, unknown>>() =>
  (await apiFetch<{ interviews: StoredInterview<TFeedback>[] }>(API_ENDPOINTS.INTERVIEWS)).interviews;

export const countInterviews = async (type: string) =>
  (await apiFetch<{ count: number }>(`${API_ENDPOINTS.INTERVIEW_COUNT}?type=${encodeURIComponent(type)}`)).count;

export const saveInterview = (interview: NewInterview) =>
  apiFetch<{ id: string; timestamp: string }>(API_ENDPOINTS.INTERVIEWS, { method: 'POST', body: interview });

export const deleteInterview = (id: string) =>
  apiFetch<{ ok: true }>(`${API_ENDPOINTS.INTERVIEWS}/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const submitRating = (rating: RatingInput) =>
  apiFetch<{ id: string }>(API_ENDPOINTS.RATINGS, { method: 'POST', body: rating });
