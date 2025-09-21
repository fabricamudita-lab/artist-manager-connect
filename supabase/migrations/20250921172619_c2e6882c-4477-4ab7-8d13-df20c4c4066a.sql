-- Clear all demo/test data from the database
-- This will remove all existing data to start fresh

-- Clear audit and event logs first (they reference other tables)
DELETE FROM audit_logs;
DELETE FROM approval_events;

-- Clear decision messages and solicitud history
DELETE FROM solicitud_decision_messages;
DELETE FROM solicitud_history;

-- Clear main work items
DELETE FROM solicitudes;
DELETE FROM approvals;
DELETE FROM booking_offers;
DELETE FROM budgets;
DELETE FROM budget_items;
DELETE FROM contracts;
DELETE FROM requests;
DELETE FROM events;
DELETE FROM event_artists;
DELETE FROM financial_reports;

-- Clear documents and media
DELETE FROM documents;
DELETE FROM media_library;
DELETE FROM epk_audios;
DELETE FROM epk_videos;
DELETE FROM epk_documentos;
DELETE FROM epks;

-- Clear project and team data
DELETE FROM project_team;
DELETE FROM project_role_bindings;
DELETE FROM project_folders;
DELETE FROM project_checklist_items;
DELETE FROM projects;

-- Clear contacts
DELETE FROM contacts;

-- Clear artist data
DELETE FROM artist_role_bindings;
DELETE FROM artists;

-- Clear workspace memberships (but keep workspaces structure)
DELETE FROM workspace_memberships;

-- Clear invitations
DELETE FROM invitations;

-- Clear templates and their items
DELETE FROM budget_template_items;
DELETE FROM budget_templates;
DELETE FROM checklist_template_items WHERE template_id NOT IN (
  SELECT id FROM checklist_templates WHERE is_system_template = true
);
DELETE FROM checklist_templates WHERE is_system_template = false;

-- Clear custom categories and configurations
DELETE FROM budget_categories;
DELETE FROM booking_template_config;
DELETE FROM booking_status_options;

-- Reset any analytics or tracking data
DELETE FROM event_document_index;

-- Clear notifications
DELETE FROM notifications;