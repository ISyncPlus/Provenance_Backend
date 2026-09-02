import { z } from "zod";
import { env } from "../env.js";

/**
 * Request shapes. Note what the submission schema does *not* accept: `status`,
 * `reason`, or any of the four check results. Those are derived server-side, so
 * allowing them as input would reintroduce exactly the forgery this design
 * exists to prevent (Decision 2).
 */

const SHA256 = /^[a-f0-9]{64}$/i;

const dataUrlImage = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const createSubmissionSchema = z.object({
  hash: z
    .string()
    .regex(SHA256, "hash must be a 64-character hex SHA-256 digest"),

  fileName: z.string().min(1).max(255),

  thumbnailUrl: z
    .string()
    .regex(dataUrlImage, "thumbnailUrl must be a base64 image data URL")
    .max(
      env.MAX_THUMBNAIL_CHARS,
      `thumbnailUrl exceeds ${env.MAX_THUMBNAIL_CHARS} characters — downscale further before sending`
    )
    .nullish(),

  metadata: z.object({
    captureTime: z.string().max(120).nullish(),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    locationName: z.string().max(400).nullish(),
    device: z.string().max(200).nullish(),
    gpsTagsPresent: z.boolean().optional().default(false),
  }),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const listSubmissionsSchema = z.object({
  status: z.enum(["Verified", "Suspicious", "Reused"]).optional(),
  q: z.string().trim().max(200).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});

export type ListSubmissionsInput = z.infer<typeof listSubmissionsSchema>;

export const onboardingSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(4, "Enter a valid registration number or staff ID")
    .max(64)
    .regex(
      /^[A-Za-z0-9/\-_.]+$/,
      "Use only letters, digits and / - _ . in an identifier"
    ),

  /**
   * Presence of a code is the *request* to be a lecturer. The server decides
   * whether it is honoured; the client never states a role directly.
   */
  inviteCode: z.string().trim().min(1).max(200).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const idParamSchema = z.object({
  id: z.string().cuid("Malformed identifier"),
});

export type IdParamInput = z.infer<typeof idParamSchema>;
