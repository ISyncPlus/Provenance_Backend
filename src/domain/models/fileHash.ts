/**
 * Domain Value Object: FileHash
 *
 * Represents an authoritative SHA-256 cryptographic digest.
 * Enforces normalization to lowercase and strict 64-character hex format.
 */
export class FileHash {
  private static readonly SHA256_REGEX = /^[a-f0-9]{64}$/i;
  readonly value: string;

  constructor(rawHash: string) {
    const trimmed = rawHash.trim().toLowerCase();
    if (!FileHash.SHA256_REGEX.test(trimmed)) {
      throw new Error(`Invalid SHA-256 hash format: "${rawHash}". Must be 64 hexadecimal characters.`);
    }
    this.value = trimmed;
  }

  equals(other: FileHash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
