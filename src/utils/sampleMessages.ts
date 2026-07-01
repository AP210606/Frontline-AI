export interface SampleMessage {
  label: string;
  category: string;
  text: string;
}

export const sampleMessages: SampleMessage[] = [
  {
    label: "Refund",
    category: "Refund",
    text: "I bought this software yesterday and it does absolutely nothing. It keeps crashing on start and your documentation is completely useless. I want my money back IMMEDIATELY! This is a total scam.",
  },
  {
    label: "Shipping Delay",
    category: "Shipping",
    text: "My package was scheduled for delivery 3 days ago. The status has been stuck at 'In Transit' at the local facility with no update since. Can someone please tell me where it is?",
  },
  {
    label: "Fraud Alert",
    category: "Fraud",
    text: "URGENT!!! I noticed a fraudulent charge of $499 on my debit card from your business website. I did not initiate this payment. Block my user account immediately before more fraud happens!",
  },
  {
    label: "Spam",
    category: "Spam",
    text: "🚨 CONGRATULATIONS 🚨 You have won a free iPhone 15 Pro Max! 🎉 Click here to verify your identity and cover the $1.99 shipping to claim it now: http://prize-rewards-winner.net",
  },
  {
    label: "Broken English",
    category: "Technical Support",
    text: "hello. app not work. i click big button and then screen stay white. i wait 10 min nothing happen. try on my phone also same. how fix?",
  },
  {
    label: "Sarcastic Complaint",
    category: "Complaint",
    text: "Oh, outstanding! Another 'minor update' that completely wiped my custom configurations. Thanks a lot for ruining my work session. Your engineers deserve an absolute medal.",
  },
  {
    label: "Technical Issue",
    category: "Technical Support",
    text: "I am experiencing an unhandled exception when uploading my SVG logo. The console displays a TypeError: Cannot read properties of undefined (reading 'width') at line 412 in main.js.",
  },
  {
    label: "Billing Problem",
    category: "Billing",
    text: "Your invoice claims I was billed $99, but my credit card statement is showing an additional charge of $15 for 'international processing fees'. Can you reverse this double fee?",
  },
  {
    label: "Legal Threat",
    category: "Legal",
    text: "If you do not terminate my membership and process a full refund of $149 for the broken features within 24 hours, I will submit a formal complaint to the Attorney General and contact my lawyer.",
  },
  {
    label: "Multiple Issues",
    category: "Unknown",
    text: "I am trying to change my password but the email link doesn't arrive. Also, my last shipment of hardware was completely crushed in the mail, and the invoice has the wrong corporate address.",
  }
];
