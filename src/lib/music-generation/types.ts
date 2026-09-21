/**
 * ArtistYar User AI Music Generator — domain types
 * Separate from Admin AI Assistant.
 */

export type AssetType =
  | "riff"
  | "melody"
  | "bassline"
  | "chord_progression"
  | "guitar_part"
  | "piano_part"
  | "keyboard_part"
  | "synth_part"
  | "pad"
  | "arpeggio"
  | "drum_loop"
  | "percussion_loop"
  | "fill"
  | "transition"
  | "intro"
  | "outro"
  | "riser"
  | "impact"
  | "texture"
  | "sound_effect"
  | "backing_fragment"
  | "arrangement_fragment"
  | "other";

export type Instrument =
  | "guitar"
  | "electric_guitar"
  | "acoustic_guitar"
  | "bass"
  | "electric_bass"
  | "piano"
  | "keys"
  | "synth"
  | "pad"
  | "drums"
  | "percussion"
  | "strings"
  | "brass"
  | "vocals"
  | "other"
  | "unspecified";

export type GenerationRole =
  | "intro"
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "bridge"
  | "outro"
  | "fill"
  | "transition"
  | "backing"
  | "lead"
  | "unspecified";

export type PerformanceStyle =
  | "natural"
  | "human"
  | "tight"
  | "loose"
  | "groovy"
  | "aggressive"
  | "soft"
  | "robotic"
  | "unspecified";

export type OutputFormat = "mp3" | "wav" | "ogg" | "flac";

export type QualityTier = "draft" | "standard" | "high" | "studio";

export type GenerationJobStatus =
  | "queued"
  | "planning"
  | "generating"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type GenerationErrorCode =
  | "ProviderUnavailable"
  | "ProviderTimeout"
  | "ProviderQuotaExceeded"
  | "UnsupportedAsset"
  | "UnsupportedInstrument"
  | "InvalidReference"
  | "ValidationFailed"
  | "StorageFailed"
  | "GenerationCancelled"
  | "GenerationExpired"
  | "PolicyRejected"
  | "InsufficientCredits"
  | "RateLimited"
  | "InternalError"
  | "ParseFailed";

/** Normalized internal structure produced by the Music Intent Parser. */
export type GenerationSpec = {
  /** Original user prompt (Persian / English). */
  prompt: string;
  assetType: AssetType;
  instrument: Instrument;
  genre?: string;
  regionalStyle?: string;
  mood?: string;
  bpm?: number;
  key?: string;
  scale?: string;
  meter?: string;
  bars?: number;
  durationMs?: number;
  register?: "low" | "mid" | "high" | "full";
  role?: GenerationRole;
  groove?: string;
  articulation?: string;
  performanceStyle?: PerformanceStyle;
  density?: "sparse" | "medium" | "dense";
  complexity?: "simple" | "medium" | "complex";
  humanization?: "low" | "medium" | "high";
  negativeConstraints?: string[];
  referenceAudioUrl?: string;
  referenceAudioStorageKey?: string;
  outputFormat?: OutputFormat;
  quality?: QualityTier;
  variations?: number;
  /** Free-text hints that did not map cleanly. */
  extraHints?: string[];
  providerPolicy?: "prefer_free" | "prefer_quality" | "prefer_speed" | "any";
};

export type ValidationResult = {
  passed: boolean;
  durationMs?: number;
  expectedDurationMs?: number;
  durationDeltaPct?: number;
  sampleRate?: number;
  channels?: number;
  peakDbfs?: number;
  clipping?: boolean;
  silence?: boolean;
  bpmEstimated?: number | null;
  bpmConfidence?: number;
  mimeType?: string;
  fileSize?: number;
  reasons: string[];
  warnings: string[];
};

export type ProviderCapability = {
  id: string;
  name: string;
  supportedAssetTypes: AssetType[];
  supportedInstruments: Instrument[];
  maxDurationMs: number;
  minDurationMs: number;
  supportedFormats: OutputFormat[];
  supportsReferenceAudio: boolean;
  supportsInstrumentalOnly: boolean;
  supportsBpm: boolean;
  supportsKey: boolean;
  supportsBars: boolean;
  costPerSecondEstimateUsd: number;
  isFreeTierAvailable: boolean;
  requiresApiKey: boolean;
  latencyClass: "fast" | "medium" | "slow";
  qualityTier: QualityTier[];
  limitations: string[];
  enabled: boolean;
};

export type ProviderGenerateRequest = {
  jobId: string;
  spec: GenerationSpec;
  signal?: AbortSignal;
};

export type ProviderGenerateResult = {
  providerId: string;
  modelId: string;
  providerJobId?: string;
  audioBuffer: ArrayBuffer;
  mimeType: string;
  durationMs?: number;
  sampleRate?: number;
  channels?: number;
  metadata?: Record<string, unknown>;
};

export type MusicGenerationProvider = {
  id: string;
  getCapabilities(): ProviderCapability;
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
  estimateCost(spec: GenerationSpec): Promise<{ credits: number; usdEstimate?: number }>;
  plan(spec: GenerationSpec): Promise<{ modelId: string; adjustedSpec: GenerationSpec; notes?: string[] }>;
  generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult>;
  generateVariation?(req: ProviderGenerateRequest & { parentOutputId: string; variationHint: string }): Promise<ProviderGenerateResult>;
  normalizeOutput?(result: ProviderGenerateResult): Promise<ProviderGenerateResult>;
};

export type GenerationJobRecord = {
  id: string;
  userId: string;
  status: GenerationJobStatus;
  prompt: string;
  spec: GenerationSpec;
  providerId?: string;
  modelId?: string;
  providerJobId?: string;
  parentJobId?: string;
  lineageRootId?: string;
  variationOfId?: string;
  refineOfId?: string;
  retryCount: number;
  maxRetries: number;
  creditsCharged: number;
  creditsRefunded: number;
  costUsd?: number;
  errorCode?: GenerationErrorCode;
  errorMessage?: string;
  validation?: ValidationResult;
  outputStorageKey?: string;
  outputPublicUrl?: string;
  outputMimeType?: string;
  outputDurationMs?: number;
  outputFileSize?: number;
  idempotencyKey?: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
};

export type GenerationOutputRecord = {
  id: string;
  jobId: string;
  userId: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  durationMs?: number;
  sampleRate?: number;
  channels?: number;
  checksum?: string;
  providerId: string;
  modelId: string;
  validation?: ValidationResult;
  metadata?: Record<string, unknown>;
  visibility: "private" | "library";
  createdAt: string;
};

export type CreditLedgerEntry = {
  id: string;
  userId: string;
  jobId?: string;
  delta: number;
  reason: "charge" | "refund" | "grant" | "purchase" | "admin_adjust";
  balanceAfter: number;
  idempotencyKey: string;
  createdAt: string;
};

export const DEFAULT_SPEC: Partial<GenerationSpec> = {
  assetType: "other",
  instrument: "unspecified",
  meter: "4/4",
  humanization: "high",
  quality: "high",
  outputFormat: "mp3",
  performanceStyle: "natural",
  providerPolicy: "prefer_quality",
  variations: 1,
};

export const PERSIAN_ERROR_MESSAGES: Record<GenerationErrorCode, string> = {
  ProviderUnavailable: "سرویس تولید موسیقی موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
  ProviderTimeout: "زمان تولید به پایان رسید. لطفاً دوباره درخواست دهید.",
  ProviderQuotaExceeded: "سهمیه سرویس تولید پر شده است. کمی بعد تلاش کنید یا از مسیر پولی استفاده کنید.",
  UnsupportedAsset: "نوع دارایی درخواستی هنوز پشتیبانی نمی‌شود.",
  UnsupportedInstrument: "ساز درخواستی در حال حاضر پشتیبانی نمی‌شود.",
  InvalidReference: "فایل مرجع نامعتبر است یا قابل پردازش نیست.",
  ValidationFailed: "خروجی تولیدشده با معیارهای کیفیت مطابقت نداشت و رد شد.",
  StorageFailed: "ذخیره‌سازی فایل با خطا مواجه شد.",
  GenerationCancelled: "تولید توسط شما لغو شد.",
  GenerationExpired: "این درخواست منقضی شده است.",
  PolicyRejected: "درخواست با سیاست‌های استفاده سازگار نیست.",
  InsufficientCredits: "اعتبار کافی ندارید.",
  RateLimited: "تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.",
  InternalError: "خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.",
  ParseFailed: "نتوانستیم درخواست موسیقی را به‌درستی تفسیر کنیم. لطفاً واضح‌تر بنویسید.",
};
