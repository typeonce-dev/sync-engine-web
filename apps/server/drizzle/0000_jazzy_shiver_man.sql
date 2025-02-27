CREATE TYPE "public"."scope" AS ENUM('read', 'read_write');--> statement-breakpoint
CREATE TABLE "client" (
	"clientId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token" (
	"tokenId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "token_tokenId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tokenValue" varchar NOT NULL,
	"clientId" uuid NOT NULL,
	"workspaceId" uuid NOT NULL,
	"isMaster" boolean DEFAULT false NOT NULL,
	"scope" "scope" NOT NULL,
	"issuedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"revokedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"workspaceId" uuid NOT NULL,
	"ownerClientId" uuid NOT NULL,
	"clientId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"snapshot" "bytea" NOT NULL
);
