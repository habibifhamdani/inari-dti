export type UserRole = "superadmin" | "admin" | "member";

export type BlacklistLevel =
  | "upload_blocked"
  | "interaction_blocked"
  | "full_ban";

export type EditionStatus =
  | "draft"
  | "submission_open"
  | "extension_poll"
  | "voting_open"
  | "completed";

export type TierPoints = 5 | 4 | 3 | 2 | 1;

export interface UserBlacklistStatus {
  level: BlacklistLevel;
  reason: string | null;
  created_at: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_superadmin: boolean;
  avatar_url: string | null;
  is_verified: boolean;
  email_verified_at: string | null;
  blacklist: UserBlacklistStatus | null;
  created_at: string | null;
}

export interface ExtensionPollSummary {
  agree_count: number;
  disagree_count: number;
  total_votes: number;
  user_vote: boolean | null;
}

export interface DtiEdition {
  id: number;
  title: string;
  slug: string;
  prompt: string;
  reference_image_url: string | null;
  status: EditionStatus;
  submission_deadline: string;
  poll_deadline: string | null;
  voting_deadline: string;
  visible_submissions_count: number;
  submissions_locked?: boolean;
  extension_poll: ExtensionPollSummary | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubmissionAuthor {
  id: number | null;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

export interface Submission {
  id: number;
  edition_id: number;
  image_url: string;
  thumbnail_url: string;
  image_width: number | null;
  image_height: number | null;
  caption: string | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  is_own_submission: boolean;
  author: SubmissionAuthor;
  created_at: string | null;
  updated_at?: string | null;
}

export interface VoteEntry {
  submission_id: number;
  tier_points: TierPoints;
}

export interface StandingBreakdown {
  netherite: number;
  diamond: number;
  gold: number;
  iron: number;
  copper: number;
}

export interface StandingEntry {
  rank: number;
  submission_id: number;
  image_url: string;
  thumbnail_url: string;
  image_width: number | null;
  image_height: number | null;
  caption: string | null;
  was_anonymous: boolean;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    avatar_url?: string | null;
  };
  total_points: number;
  vote_count: number;
  breakdown: StandingBreakdown;
}

export interface StandingsData {
  winners: StandingEntry[];
  honorable_mentions: StandingEntry[];
  standings: StandingEntry[];
}

export interface EditionDetailResponse {
  edition: DtiEdition | null;
  submissions: Submission[];
  submissions_locked?: boolean;
  my_submission: Submission | null;
  my_votes: VoteEntry[];
  standings: StandingsData | null;
}

export interface WhitelistedEmailEntry {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string | null;
}

export interface BlacklistedUserEntry {
  id: number;
  user_id: number;
  level: BlacklistLevel;
  reason: string | null;
  blacklisted_by: string | null;
  user: {
    id: number | null;
    name: string;
    email: string;
    role: UserRole | null;
    avatar_url: string | null;
  };
  created_at: string | null;
  updated_at: string | null;
}
