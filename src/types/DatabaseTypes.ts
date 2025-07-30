// TypeScript definitions for Apple Messages chat.db structure

export interface Message {
  ROWID: number;
  guid: string;
  text?: string;
  attributedBody?: any; // BLOB data for newer message format
  handle_id: number;
  subject?: string;
  country?: string;
  attributedBody_encoding?: string;
  service: string;
  account: string;
  account_guid: string;
  date: number;
  date_read?: number;
  date_delivered?: number;
  is_delivered: number;
  is_finished: number;
  is_emote: number;
  is_from_me: number;
  is_empty: number;
  is_delayed: number;
  is_auto_reply: number;
  is_prepared: number;
  is_read: number;
  is_system_message: number;
  is_sent: number;
  has_dd_results: number;
  is_service_message: number;
  is_forward: number;
  was_downgraded: number;
  is_archive: number;
  cache_has_attachments: number;
  cache_roomnames?: string;
  was_data_detected: number;
  was_deduplicated: number;
  is_audio_message: number;
  is_played: number;
  date_played?: number;
  item_type: number;
  other_handle: number;
  group_title?: string;
  group_action_type: number;
  share_status: number;
  share_direction: number;
  is_expirable: number;
  expire_state: number;
  message_action_type: number;
  message_source: number;
  associated_message_guid?: string;
  associated_message_type: number;
  balloon_bundle_id?: string;
  payload_data?: any;
  expressive_send_style_id?: string;
  associated_message_range_location: number;
  associated_message_range_length: number;
  time_expressive_send_played?: number;
  message_summary_info?: any;
  ck_sync_state: number;
  ck_record_id?: string;
  ck_record_change_tag?: string;
  destination_caller_id?: string;
  is_corrupt: number;
  reply_to_guid?: string;
  sort_id: number;
  is_spam: number;
  has_unseen_mention: number;
  thread_originator_guid?: string;
  thread_originator_part?: string;
  syndication_ranges?: string;
  synced_syndication_ranges?: string;
  was_delivered_quietly: number;
  did_notify_recipient: number;
  date_retracted?: number;
  date_edited?: number;
  was_detonated: number;
  part_count: number;
  is_stewie: number;
  is_kt_verified: number;
  is_sos: number;
  is_critical: number;
  bia_reference_id?: string;
  is_scheduled: number;
  scheduled_date?: number;
}

export interface Handle {
  ROWID: number;
  id: string;
  country?: string;
  service: string;
  uncanonicalized_id?: string;
  person_centric_id?: string;
}

export interface Chat {
  ROWID: number;
  guid: string;
  style: number;
  state: number;
  account_id?: string;
  properties?: any;
  chat_identifier?: string;
  service_name: string;
  room_name?: string;
  account_login?: string;
  is_archived: number;
  last_addressed_handle?: string;
  display_name?: string;
  group_id?: string;
  is_filtered: number;
  successful_query: number;
  engram_id?: string;
  server_change_token?: string;
  ck_sync_state: number;
  original_group_id?: string;
  last_read_message_timestamp: number;
  sr_server_change_token?: string;
  sr_ck_sync_state: number;
}

export interface ChatHandleJoin {
  chat_id: number;
  handle_id: number;
}

export interface ChatMessageJoin {
  chat_id: number;
  message_id: number;
  message_date: number;
}

export interface Attachment {
  ROWID: number;
  guid: string;
  created_date: number;
  start_date: number;
  filename?: string;
  uti?: string;
  mime_type?: string;
  transfer_state: number;
  is_outgoing: number;
  user_info?: any;
  transfer_name?: string;
  total_bytes: number;
  is_sticker: number;
  sticker_user_info?: any;
  attribution_info?: any;
  hide_attachment: number;
  ck_sync_state: number;
  ck_server_change_token?: string;
  ck_record_id?: string;
  original_guid?: string;
  sr_ck_sync_state: number;
  sr_ck_server_change_token?: string;
  is_commsafety_sensitive: number;
}

export interface MessageAttachmentJoin {
  message_id: number;
  attachment_id: number;
}

// Processed types for display
export interface ProcessedMessage {
  id: number;
  text: string;
  isFromMe: boolean;
  timestamp: Date;
  handleId: number;
  handleName?: string;
  attachments?: ProcessedAttachment[];
  isGroupMessage: boolean;
  chatId: number;
}

export interface ProcessedChat {
  id: number;
  guid: string;
  displayName: string;
  isGroupChat: boolean;
  participants: string[];
  lastMessage?: ProcessedMessage;
  messageCount: number;
}

export interface ProcessedAttachment {
  id: number;
  filename: string;
  mimeType: string;
  totalBytes: number;
  isSticker: boolean;
}

// Note: Using WebsqlDatabase from react-native-sqlite-2 instead of custom interfaces