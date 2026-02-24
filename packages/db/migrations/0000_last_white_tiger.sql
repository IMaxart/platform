CREATE TABLE "accounts" (
	"access_token" text,
	"access_token_expires_at" timestamp with time zone,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "console_errors" (
	"column_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text NOT NULL,
	"line_number" integer,
	"message" text NOT NULL,
	"path" text,
	"service_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"source_url" text,
	"stack" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"path" text,
	"properties" jsonb,
	"service_id" uuid NOT NULL,
	"session_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "excluded_devices" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"reason" text,
	"service_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"service_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"logo" text,
	"metadata" text,
	"name" text NOT NULL,
	"slug" text,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"duration_ms" integer,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"scroll_depth_pct" integer,
	"service_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"backed_up" boolean,
	"counter" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"device_type" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"transports" text,
	"user_id" text NOT NULL,
	"webauthn_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"team_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"allowed_origins" text[] DEFAULT '{}' NOT NULL,
	"analytics_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_retention_days" integer DEFAULT 365 NOT NULL,
	"domain" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"environments" text[] DEFAULT '{"production"}' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"primary_domain" text,
	"project_id" uuid NOT NULL,
	"public_status_host" text,
	"salt" text,
	"slug" text NOT NULL,
	"status_enabled" boolean DEFAULT false NOT NULL,
	"track_errors" boolean DEFAULT true NOT NULL,
	"track_events" boolean DEFAULT true NOT NULL,
	"track_feature_flags" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "status_checks" (
	"checked_at" timestamp with time zone NOT NULL,
	"degraded" boolean NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"error_kind" text,
	"error_message" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latency_ms" integer,
	"ok" boolean NOT NULL,
	"probe" text NOT NULL,
	"status_code" integer
);
--> statement-breakpoint
CREATE TABLE "status_endpoints" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"degraded_ms" integer NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expected_status_max" integer NOT NULL,
	"expected_status_min" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_host" text,
	"internal_mode" text NOT NULL,
	"internal_path" text NOT NULL,
	"internal_url" text,
	"interval_sec" integer NOT NULL,
	"key" text NOT NULL,
	"method" text NOT NULL,
	"public_url" text,
	"service_id" uuid NOT NULL,
	"timeout_ms" integer NOT NULL,
	"warn_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_internet_checks" (
	"checked_at" timestamp with time zone NOT NULL,
	"error_kind" text,
	"error_message" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latency_ms" integer,
	"ok" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_rollups_daily" (
	"avg_latency_ms" double precision,
	"day_start" timestamp with time zone NOT NULL,
	"degraded" integer NOT NULL,
	"down" integer NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"p95_latency_ms" integer,
	"probe" text NOT NULL,
	"total" integer NOT NULL,
	"up" integer NOT NULL,
	CONSTRAINT "status_rollups_daily_endpoint_id_probe_day_start_pk" PRIMARY KEY("endpoint_id","probe","day_start")
);
--> statement-breakpoint
CREATE TABLE "status_service_dokploy" (
	"last_deployed_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone NOT NULL,
	"ref_id" text NOT NULL,
	"service_id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"backup_codes" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"browser_name" text NOT NULL,
	"browser_version" text NOT NULL,
	"city" text,
	"country_code" text,
	"device_type" text NOT NULL,
	"ended_at" timestamp with time zone,
	"environment" text DEFAULT 'production' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"language" text,
	"os_name" text NOT NULL,
	"os_version" text NOT NULL,
	"referrer" text,
	"region" text,
	"screen_height" integer,
	"screen_width" integer,
	"service_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"timezone" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_medium" text,
	"utm_source" text,
	"utm_term" text,
	"visitor_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "console_errors" ADD CONSTRAINT "console_errors_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "console_errors" ADD CONSTRAINT "console_errors_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excluded_devices" ADD CONSTRAINT "excluded_devices_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_organizations_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_checks" ADD CONSTRAINT "status_checks_endpoint_id_status_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."status_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_endpoints" ADD CONSTRAINT "status_endpoints_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_rollups_daily" ADD CONSTRAINT "status_rollups_daily_endpoint_id_status_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."status_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_service_dokploy" ADD CONSTRAINT "status_service_dokploy_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "console_errors_service_id_idx" ON "console_errors" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "console_errors_session_id_idx" ON "console_errors" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "console_errors_level_idx" ON "console_errors" USING btree ("level");--> statement-breakpoint
CREATE INDEX "events_service_id_idx" ON "events" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "events_session_id_idx" ON "events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "events_name_idx" ON "events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "events_service_name_idx" ON "events" USING btree ("service_id","name");--> statement-breakpoint
CREATE INDEX "excluded_devices_service_id_idx" ON "excluded_devices" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "excluded_devices_visitor_hash_idx" ON "excluded_devices" USING btree ("visitor_hash");--> statement-breakpoint
CREATE INDEX "feature_flags_service_id_idx" ON "feature_flags" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "feature_flags_service_key_idx" ON "feature_flags" USING btree ("service_id","key");--> statement-breakpoint
CREATE INDEX "page_views_service_id_idx" ON "page_views" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "page_views_session_id_idx" ON "page_views" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "page_views_entered_at_idx" ON "page_views" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "page_views_service_path_idx" ON "page_views" USING btree ("service_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "status_checks_endpoint_probe_at_idx" ON "status_checks" USING btree ("endpoint_id","probe","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "status_endpoints_service_key_idx" ON "status_endpoints" USING btree ("service_id","key");--> statement-breakpoint
CREATE INDEX "status_internet_checks_at_idx" ON "status_internet_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "two_factors_secret_idx" ON "two_factors" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_service_id_idx" ON "visitor_sessions" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_started_at_idx" ON "visitor_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_visitor_hash_idx" ON "visitor_sessions" USING btree ("visitor_hash");--> statement-breakpoint
CREATE INDEX "visitor_sessions_service_started_idx" ON "visitor_sessions" USING btree ("service_id","started_at");