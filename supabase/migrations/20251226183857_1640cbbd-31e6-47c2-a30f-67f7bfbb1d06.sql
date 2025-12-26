-- Clean all data except templates, profiles, workspaces
-- Order matters due to foreign key constraints

-- Delete chat messages first
DELETE FROM public.channel_messages;
DELETE FROM public.channel_members;
DELETE FROM public.chat_channels;
DELETE FROM public.chat_messages;

-- Delete approval-related data
DELETE FROM public.approval_comments;
DELETE FROM public.approval_events;
DELETE FROM public.approvals;

-- Delete solicitudes-related data
DELETE FROM public.solicitud_decision_messages;
DELETE FROM public.solicitud_history;
DELETE FROM public.solicitudes;

-- Delete requests
DELETE FROM public.requests;

-- Delete booking-related data
DELETE FROM public.contract_signers;
DELETE FROM public.booking_documents;
DELETE FROM public.booking_expenses;
DELETE FROM public.booking_itinerary;

-- Delete budget-related data (keep templates)
DELETE FROM public.budget_versions;
DELETE FROM public.budget_attachments;
DELETE FROM public.budget_items;
DELETE FROM public.budgets;

-- Delete financial data (skip profit_and_loss view)
DELETE FROM public.payment_alerts;
DELETE FROM public.payment_schedules;
DELETE FROM public.quick_expenses;
DELETE FROM public.transactions;
DELETE FROM public.financial_reports;

-- Delete royalty-related data
DELETE FROM public.royalty_payments;
DELETE FROM public.royalty_earnings;
DELETE FROM public.royalty_splits;
DELETE FROM public.platform_earnings;
DELETE FROM public.song_splits;
DELETE FROM public.songs;
DELETE FROM public.track_credits;
DELETE FROM public.track_versions;
DELETE FROM public.tracks;

-- Delete file/storage data
DELETE FROM public.artist_files;
DELETE FROM public.artist_subfolders;
DELETE FROM public.storage_nodes;
DELETE FROM public.project_resources;
DELETE FROM public.project_files;
DELETE FROM public.project_file_links;

-- Delete EPK data
DELETE FROM public.epk_analytics;
DELETE FROM public.epk_password_attempts;
DELETE FROM public.epk_audios;
DELETE FROM public.epk_documentos;
DELETE FROM public.epk_fotos;
DELETE FROM public.epk_videos;
DELETE FROM public.epks;

-- Delete media library
DELETE FROM public.media_library;

-- Delete release data
DELETE FROM public.release_assets;
DELETE FROM public.release_budgets;
DELETE FROM public.release_milestones;
DELETE FROM public.releases;

-- Delete project-related data
DELETE FROM public.project_role_bindings;
DELETE FROM public.project_checklist_items;
DELETE FROM public.project_team;
DELETE FROM public.projects;

-- Delete events
DELETE FROM public.event_document_index;
DELETE FROM public.event_index_status;
DELETE FROM public.event_artists;
DELETE FROM public.events;

-- Delete contact data
DELETE FROM public.contact_group_members;
DELETE FROM public.contact_artist_assignments;
DELETE FROM public.contacts;
DELETE FROM public.contact_groups;

-- Delete action center
DELETE FROM public.action_center_comments;
DELETE FROM public.action_center_history;
DELETE FROM public.action_center;

-- Delete booking offers (after all dependencies)
DELETE FROM public.booking_offers;

-- Delete documents and contracts
DELETE FROM public.documents;
DELETE FROM public.contracts;

-- Delete notifications and invitations
DELETE FROM public.notifications;
DELETE FROM public.invitations;

-- Delete artist bindings and artists
DELETE FROM public.artist_role_bindings;
DELETE FROM public.artists;

-- Clear audit logs
DELETE FROM public.audit_logs;

-- KEEP: checklist_templates, checklist_template_items, budget_templates, budget_template_items, 
-- booking_status_options, booking_template_config, budget_categories, profiles, workspaces, workspace_memberships
