-- CreateTable
CREATE TABLE "job_postings" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "location" TEXT,
    "analyzedData" JSONB,
    "apiId" TEXT,
    "datePosted" TIMESTAMP(3),
    "dateCreated" TIMESTAMP(3),
    "organizationUrl" TEXT,
    "dateValidThrough" TIMESTAMP(3),
    "locationsRaw" JSONB,
    "locationType" TEXT,
    "locationRequirements" JSONB,
    "salary" JSONB,
    "employmentType" JSONB,
    "sourceType" TEXT,
    "source" TEXT,
    "sourceDomain" TEXT,
    "organizationLogo" TEXT,
    "citiesDerived" JSONB,
    "regionsDerived" JSONB,
    "countriesDerived" JSONB,
    "locationsDerived" JSONB,
    "timezonesDerived" JSONB,
    "latsDerived" JSONB,
    "lngsDerived" JSONB,
    "remoteDerived" BOOLEAN,
    "linkedinOrgInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_analyses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobPostingId" INTEGER NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_postings_apiId_idx" ON "job_postings"("apiId");

-- CreateIndex
CREATE UNIQUE INDEX "job_analyses_userId_jobPostingId_key" ON "job_analyses"("userId", "jobPostingId");

-- AddForeignKey
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
