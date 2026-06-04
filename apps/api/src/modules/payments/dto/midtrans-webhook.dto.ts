import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsIn,
  Length,
  Matches,
} from 'class-validator';

/**
 * MidtransWebhookDto — validates incoming Midtrans payment notification payloads.
 *
 * Midtrans sends POST requests to our webhook endpoint when payment status changes.
 * This DTO enforces the expected schema so that malformed/spoofed payloads are
 * rejected with HTTP 400 before any business logic executes.
 *
 * Reference: https://docs.midtrans.com/docs/http-notification-webhooks
 */
export class MidtransWebhookDto {
  /**
   * Midtrans order ID — must match a payment record in our DB.
   * Format: "{orderNumber}-{timestamp}"  e.g. "ORD-001-1717500000000"
   */
  @IsString()
  @IsNotEmpty()
  order_id: string;

  /**
   * Current transaction status from Midtrans.
   * Restricted to the set of statuses we handle to prevent injection of unexpected values.
   */
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'capture',
    'settlement',
    'pending',
    'deny',
    'cancel',
    'expire',
    'refund',
    'partial_refund',
    'chargeback',
    'partial_chargeback',
    'authorize',
  ])
  transaction_status: string;

  /**
   * Total transaction amount as a string decimal (e.g. "150000.00").
   * Must be a numeric string — used in HMAC signature validation.
   */
  @IsNumberString()
  @IsNotEmpty()
  gross_amount: string;

  /**
   * Midtrans HTTP status code (e.g. "200", "201", "407").
   * Used in HMAC signature validation.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}$/, {
    message: 'status_code must be a 3-digit numeric string',
  })
  status_code: string;

  /**
   * Unique Midtrans transaction ID.
   */
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  /**
   * Payment method used (e.g. "bank_transfer", "credit_card", "gopay").
   */
  @IsString()
  @IsOptional()
  payment_type?: string;

  /**
   * ISO 8601 transaction timestamp.
   */
  @IsString()
  @IsOptional()
  transaction_time?: string;

  /**
   * Merchant ID in Midtrans.
   */
  @IsString()
  @IsOptional()
  merchant_id?: string;

  /**
   * Currency code (e.g. "IDR").
   */
  @IsString()
  @IsOptional()
  @Length(3, 3)
  currency?: string;

  /**
   * HMAC-SHA512 signature sent by Midtrans for authenticity verification.
   * Validated separately inside the service via crypto.createHash.
   */
  @IsString()
  @IsOptional()
  signature_key?: string;

  /**
   * Fraud detection status (e.g. "accept", "challenge", "deny").
   */
  @IsString()
  @IsOptional()
  fraud_status?: string;
}
