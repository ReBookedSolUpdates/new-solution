// Central export point for all email templates and utilities
export { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate, type EmailTemplate, type EmailTemplateData } from './styles';
export { EMAIL_TEMPLATES, getTemplateById, getTemplatesByCategory, getAllTemplateCategories } from './registry';

// Payment & Notification Templates
export { createWalletCreditNotificationEmail, sendWalletCreditNotificationEmail, type WalletCreditNotificationData } from './templates/wallet-credit-notification';
export { createSellerCreditNotificationEmail, sendSellerCreditNotificationEmail, type SellerCreditNotificationData } from './templates/seller-credit-notification';
export { createDenialEmailTemplate, sendDenialEmail, type DenialEmailData } from './templates/denial';

// Order Management Templates
export { createPendingCommitEmail, sendPendingCommitEmail, type PendingCommitEmailData } from './templates/pending-commit';
export { createSellerAwayNotificationEmail, sendSellerAwayNotificationEmail, type SellerAwayNotificationData } from './templates/seller-away-notification';
export { createOrderDeclinedBuyerEmail, sendOrderDeclinedBuyerEmail, type OrderDeclinedBuyerData } from './templates/order-declined-buyer';
export { createOrderDeclinedSellerEmail, sendOrderDeclinedSellerEmail, type OrderDeclinedSellerData } from './templates/order-declined-seller';
export { createOrderConfirmedBuyerEmail, sendOrderConfirmedBuyerEmail, type OrderConfirmedBuyerData } from './templates/order-confirmed-buyer';
export { createOrderConfirmedSellerEmail, sendOrderConfirmedSellerEmail, type OrderConfirmedSellerData } from './templates/order-confirmed-seller';

// Delivery & Feedback Templates
export { createDeliveryConfirmationRequestEmail, sendDeliveryConfirmationRequestEmail, type DeliveryConfirmationRequestData } from './templates/delivery-confirmation-request';
export { createDeliveryConfirmedBuyerEmail, sendDeliveryConfirmedBuyerEmail, type DeliveryConfirmedBuyerData } from './templates/delivery-confirmed-buyer';
export { createDeliveryComplaintAcknowledgmentBuyerEmail, sendDeliveryComplaintAcknowledgmentBuyerEmail, type DeliveryComplaintAcknowledgmentBuyerData } from './templates/delivery-complaint-acknowledgment-buyer';
export { createDeliveryComplaintNotificationSellerEmail, sendDeliveryComplaintNotificationSellerEmail, type DeliveryComplaintNotificationSellerData } from './templates/delivery-complaint-notification-seller';
export { createSellerWaitingForDeliveryConfirmationEmail, sendSellerWaitingForDeliveryConfirmationEmail, type SellerWaitingForDeliveryConfirmationData } from './templates/seller-waiting-for-delivery-confirmation';
export { createPaymentOnTheWayBankTransferEmail, sendPaymentOnTheWayBankTransferEmail, type PaymentOnTheWayBankTransferData } from './templates/payment-on-the-way-bank-transfer';

// Contact & Support Templates
export { createContactAcknowledgmentEmail, sendContactAcknowledgmentEmail, type ContactAcknowledgmentData } from './templates/contact-acknowledgment';
