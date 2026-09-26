export type UserRole = "user" | "admin";
export type SubscriptionPlan = "basic" | "premium" | "business" | "enterprise";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "qr_ready";
export type RequestStatus = "pending" | "contacted" | "approved" | "rejected" | "resolved";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_active: boolean;
  activation_start?: string | null;
  activation_end?: string | null;
  plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface BotInstance {
  id: string;
  user_id: string;
  bot_name: string;
  prefix: string;
  mode: "public" | "private";
  session_data?: any;
  connection_status: ConnectionStatus;
  qr_code?: string | null;
  pairing_code?: string | null;
  whatsapp_number?: string | null;
  whatsapp_name?: string | null;
  last_connected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BotConfig {
  id: string;
  bot_id: string;
  sticker_pack_name: string;
  sticker_author: string;
  alive_message: string;
  alive_image_url?: string | null;
  audio_title: string;
  audio_artist: string;
  audio_thumbnail_url?: string | null;
  bot_info: string;
  auto_read: boolean;
  auto_react: boolean;
  auto_status_view: boolean;
  auto_call_reject: boolean;
  call_reject_message: string;
  start_message: boolean;
  error_message: boolean;
  sudo_numbers: string[];
  custom_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string | null;
  plan_interest: SubscriptionPlan;
  status: RequestStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
}
