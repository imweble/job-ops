/**
 * Service for running the UK Visa Jobs extractor (extractors/ukvisajobs).
 * 
 * Spawns the extractor as a child process and reads its output dataset.
 */

import { spawn } from 'child_process';
import { readdir, readFile, rm, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CreateJobInput } from '../../shared/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UKVISAJOBS_DIR = join(__dirname, '../../../../extractors/ukvisajobs');
const STORAGE_DIR = join(UKVISAJOBS_DIR, 'storage/datasets/default');

export interface RunUkVisaJobsOptions {
    /** Maximum number of jobs to fetch per search term. Defaults to 50, max 200. */
    maxJobs?: number;
    /** Search keyword filter (single) - legacy support */
    searchKeyword?: string;
    /** List of search terms to run sequentially */
    searchTerms?: string[];
}

export interface UkVisaJobsResult {
    success: boolean;
    jobs: CreateJobInput[];
    error?: string;
}

/**
 * Basic HTML to text conversion to extract job description.
 */
function cleanHtml(html: string): string {
    // Remove script, style tags and their content
    let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    
    // Try to extract content between <main> tags if present, or fallback to body
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (mainMatch) {
        text = mainMatch[1];
    } else if (bodyMatch) {
        text = bodyMatch[1];
    }

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Unescape common entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"');
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit length to avoid blowing up AI context
    if (text.length > 8000) {
        text = text.substring(0, 8000) + '...';
    }
    
    return text;
}

/**
 * Fetch job description from the job URL.
 */
async function fetchJobDescription(url: string): Promise<string | null> {
    try {
        console.log(`      Fetching description from ${url}...`);
        
        // Build cookies if present in env (similar to extractor)
        const cookieParts: string[] = [];
        if (process.env.UKVISAJOBS_CSRF_TOKEN) cookieParts.push(`csrf_token=${process.env.UKVISAJOBS_CSRF_TOKEN}`);
        if (process.env.UKVISAJOBS_CI_SESSION) cookieParts.push(`ci_session=${process.env.UKVISAJOBS_CI_SESSION}`);
        const token = process.env.UKVISAJOBS_AUTH_TOKEN || process.env.UKVISAJOBS_TOKEN;
        if (token) cookieParts.push(`authToken=${token}`);
        
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        if (cookieParts.length > 0) {
            headers['Cookie'] = cookieParts.join('; ');
        }

        const response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(10000) // 10s timeout
        });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        const cleaned = cleanHtml(html);
        
        // If we only got a tiny bit of text, it might have failed
        return cleaned.length > 100 ? cleaned : null;
    } catch (error) {
        console.warn(`      ⚠️ Failed to fetch description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}

/**
 * Clear previous extraction results.
 */
async function clearStorageDataset(): Promise<void> {
    try {
        await rm(STORAGE_DIR, { recursive: true, force: true });
    } catch {
        // Ignore if directory doesn't exist
    }
}

export async function runUkVisaJobs(options: RunUkVisaJobsOptions = {}): Promise<UkVisaJobsResult> {
    console.log('🇬🇧 Running UK Visa Jobs extractor...');

    // Determine terms to run
    const terms: string[] = [];
    if (options.searchTerms && options.searchTerms.length > 0) {
        terms.push(...options.searchTerms);
    } else if (options.searchKeyword) {
        terms.push(options.searchKeyword);
    } else {
        // No search terms = run once without keyword
        terms.push('');
    }

    const allJobs: CreateJobInput[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const termLabel = term ? `"${term}"` : 'all jobs';
        console.log(`   Running for ${termLabel}...`);

        try {
            // Clear previous results for this run
            await clearStorageDataset();
            await mkdir(STORAGE_DIR, { recursive: true });

            // Run the extractor
            await new Promise<void>((resolve, reject) => {
                const child = spawn('npx', ['tsx', 'src/main.ts'], {
                    cwd: UKVISAJOBS_DIR,
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        UKVISAJOBS_MAX_JOBS: String(options.maxJobs ?? 50),
                        UKVISAJOBS_SEARCH_KEYWORD: term,
                    },
                });

                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`UK Visa Jobs extractor exited with code ${code}`));
                });
                child.on('error', reject);
            });

            // Read the output dataset and accumulate
            const runJobs = await readDataset();
            let newCount = 0;

            for (const job of runJobs) {
                // Deduplicate by sourceJobId or jobUrl
                const id = job.sourceJobId || job.jobUrl;
                if (!seenIds.has(id)) {
                    seenIds.add(id);

                    // Enrich description if missing or poor
                    const isPoorDescription = !job.jobDescription || 
                                            job.jobDescription.length < 100 || 
                                            job.jobDescription.startsWith('Visa sponsorship info:');
                    
                    if (isPoorDescription && job.jobUrl) {
                        const enriched = await fetchJobDescription(job.jobUrl);
                        if (enriched) {
                            job.jobDescription = enriched;
                        }
                        // Small delay to avoid hammering the server
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }

                    allJobs.push(job);
                    newCount++;
                }
            }

            console.log(`   ✅ Fetched ${runJobs.length} jobs for ${termLabel} (${newCount} new unique)`);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ UK Visa Jobs failed for ${termLabel}: ${message}`);
            // Continue to next term instead of failing completely
        }

        // Delay between terms
        if (i < terms.length - 1) {
            console.log('   Waiting 5s before next search term...');
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    console.log(`✅ UK Visa Jobs: imported total ${allJobs.length} unique jobs`);
    return { success: true, jobs: allJobs };
}

/**
 * Read jobs from the extractor's output dataset.
 */
async function readDataset(): Promise<CreateJobInput[]> {
    const jobs: CreateJobInput[] = [];

    try {
        const files = await readdir(STORAGE_DIR);
        const jsonFiles = files.filter((f) => f.endsWith('.json') && f !== 'jobs.json');

        for (const file of jsonFiles.sort()) {
            try {
                const content = await readFile(join(STORAGE_DIR, file), 'utf-8');
                const job = JSON.parse(content);

                // Map to CreateJobInput format
                jobs.push({
                    source: 'ukvisajobs',
                    sourceJobId: job.sourceJobId,
                    title: job.title || 'Unknown Title',
                    employer: job.employer || 'Unknown Employer',
                    employerUrl: job.employerUrl,
                    jobUrl: job.jobUrl,
                    applicationLink: job.applicationLink || job.jobUrl,
                    location: job.location,
                    deadline: job.deadline,
                    salary: job.salary,
                    jobDescription: job.jobDescription,
                    datePosted: job.datePosted,
                    degreeRequired: job.degreeRequired,
                    jobType: job.jobType,
                    jobLevel: job.jobLevel,
                });
            } catch {
                // Skip invalid files
            }
        }
    } catch {
        // Dataset directory doesn't exist yet
    }

    return jobs;
}
