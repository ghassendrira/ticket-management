import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';

const TEAMS_API_URL = `${environment.apiUrl}/api/teams`;
const AGENTS_API_URL = `${environment.apiUrl}/api/agents`;
const ASSIGNMENT_API_URL = `${environment.apiUrl}/api/assignments`;
export type ManagedCategory =
  | 'ACCOUNT_ACCESS'
  | 'BILLING'
  | 'TECHNICAL'
  | 'ORDER'
  | 'DELIVERY'
  | 'SECURITY'
  | 'INFORMATION'
  | 'OTHER';

export interface TeamRequest {
  name: string;
  description?: string;
  managedCategories: string[];
  managerId: string;   // ← AJOUTE ICI
}

export interface TeamResponse {
  id: string;
  description?: string;
  name: string;
  managedCategories: ManagedCategory[];
  agentCount: number;
  createdAt: string;
  managerId: string | null;
  managerName: string | null;
}

export interface MyTeamResponse {
  teamId: string;
  teamName: string;
  managerId: string | null;
  managerName: string | null;
  agentCount: number;
}

export interface AgentSkillRequest {
  skillName: string;
  level: number;
}

export interface AgentSkillResponse {
  id: string;
  skillName: string;
  level: number;
}

export interface AgentProfileResponse {
  id: string;
  userId: string;
  fullName?: string;
  teamId: string | null;
  teamName: string | null;
  isOnline: boolean;
  maxConcurrentTickets: number;
  skills: AgentSkillResponse[];
}

export interface AssignAgentRequest {
  userId: string;
  maxConcurrentTickets?: number;
}

export interface UpdateAgentTeamRequest {
  teamId: string | null;
}
export interface AssignmentRecommendationRequest {
  ticketId: string;
  category: string;
  priority: string;
  teamId?: string;
}

export interface ScoringFactor {
  criterion: string;
  weight: number;
  contribution: number;
}

export interface AlternativeAgentResponse {
  agentId: string;
  userId: string;
  agentName: string;
  score: number;
}

export interface AssignmentRecommendationResponse {
  recommendedAgentId: string;
  userId: string;
  agentName: string;
  score: number;
  factors: ScoringFactor[];
  alternatives: AlternativeAgentResponse[];
}
@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  constructor(private http: HttpClient) { }

  getTeams() {
    return this.http.get<TeamResponse[]>(TEAMS_API_URL)
      .pipe(catchError(this.handleError));
  }

  getTeam(id: string) {
    return this.http.get<TeamResponse>(`${TEAMS_API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createTeam(request: TeamRequest) {
    return this.http.post<TeamResponse>(TEAMS_API_URL, request)
      .pipe(catchError(this.handleError));
  }

  updateTeam(id: string, request: TeamRequest) {
    return this.http.put<TeamResponse>(`${TEAMS_API_URL}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  deleteTeam(id: string) {
    return this.http.delete<void>(`${TEAMS_API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getMyTeam() {
    return this.http.get<MyTeamResponse | null>(`${TEAMS_API_URL}/my-team`)
      .pipe(catchError(this.handleError));
  }

  getMyTeams() {
    return this.http.get<TeamResponse[]>(`${TEAMS_API_URL}/my-teams`)
      .pipe(catchError(this.handleError));
  }

  getAvailableManagers() {
    return this.http.get<any[]>(`${TEAMS_API_URL}/managers/available`)
      .pipe(catchError(this.handleError));
  }

  getTeamAgents(id: string) {
    return this.http.get<AgentProfileResponse[]>(`${TEAMS_API_URL}/${id}/agents`)
      .pipe(catchError(this.handleError));
  }

  addAgentToTeam(teamId: string, userId: string) {
    return this.http.post<void>(`${TEAMS_API_URL}/${teamId}/agents/${userId}`, {})
      .pipe(catchError(this.handleError));
  }

  removeAgentFromTeam(teamId: string, userId: string) {
    return this.http.delete<void>(`${TEAMS_API_URL}/${teamId}/agents/${userId}`)
      .pipe(catchError(this.handleError));
  }

  getAgents() {
    return this.http.get<AgentProfileResponse[]>(AGENTS_API_URL)
      .pipe(catchError(this.handleError));
  }

  getAgent(id: string) {
    return this.http.get<AgentProfileResponse>(`${AGENTS_API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createAgentProfile(request: AssignAgentRequest) {
    return this.http.post<AgentProfileResponse>(AGENTS_API_URL, request)
      .pipe(catchError(this.handleError));
  }

  updateAgentTeam(agentId: string, request: UpdateAgentTeamRequest) {
    return this.http.patch<AgentProfileResponse>(`${AGENTS_API_URL}/${agentId}/team`, request)
      .pipe(catchError(this.handleError));
  }

  addSkill(agentId: string, request: AgentSkillRequest) {
    return this.http.post<AgentProfileResponse>(`${AGENTS_API_URL}/${agentId}/skills`, request)
      .pipe(catchError(this.handleError));
  }

  deleteSkill(agentId: string, skillId: string) {
    return this.http.delete<void>(`${AGENTS_API_URL}/${agentId}/skills/${skillId}`)
      .pipe(catchError(this.handleError));
  }
  updateAgentStatus(agentId: string, isOnline: boolean) {
    return this.http.put<void>(`${AGENTS_API_URL}/${agentId}/status`, { isOnline })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Assignment service error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }

  recommendAssignment(request: AssignmentRecommendationRequest) {
    return this.http.post<AssignmentRecommendationResponse>(
      `${ASSIGNMENT_API_URL}/recommend`,
      request
    ).pipe(catchError(this.handleError));
  }
}
