ALTER TABLE "users" DROP COLUMN "snapshot";
ALTER TABLE "users" ADD COLUMN "snapshot" bytea;