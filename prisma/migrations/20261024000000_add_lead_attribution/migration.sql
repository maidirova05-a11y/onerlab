-- Marketing attribution on leads: UTM tags, the external referrer and the
-- landing path, captured by the form on the visitor's first page view.
-- All nullable, so existing rows need no backfill and the write path never
-- fails for lack of them.

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "landingPath" VARCHAR(255),
ADD COLUMN     "referrer" VARCHAR(500),
ADD COLUMN     "utmCampaign" VARCHAR(120),
ADD COLUMN     "utmContent" VARCHAR(120),
ADD COLUMN     "utmMedium" VARCHAR(120),
ADD COLUMN     "utmSource" VARCHAR(120),
ADD COLUMN     "utmTerm" VARCHAR(120);
