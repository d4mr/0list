import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

export interface AdminNotificationEmailProps {
  waitlistName: string;
  signupEmail: string;
  position: number;
  customData?: Record<string, string>;
  referralSource?: string;
  adminUrl: string;
}

export function AdminNotificationEmail({
  waitlistName = "My Waitlist",
  signupEmail = "user@example.com",
  position = 47,
  customData = {},
  referralSource,
  adminUrl = "https://example.com/admin",
}: AdminNotificationEmailProps) {
  const customFields = Object.entries(customData);

  return (
    <Html>
      <Head />
      <Preview>{`New signup #${position}: ${signupEmail}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>New Waitlist Signup</Text>
          <Heading style={heading}>{waitlistName}</Heading>
          
          <Section style={infoSection}>
            <Text style={infoLabel}>Email</Text>
            <Text style={infoValue}>{signupEmail}</Text>
            
            <Text style={infoLabel}>Position</Text>
            <Text style={infoValue}>#{position}</Text>
            
            {referralSource && (
              <>
                <Text style={infoLabel}>Source</Text>
                <Text style={infoValue}>{referralSource}</Text>
              </>
            )}
            
            {customFields.length > 0 && (
              <>
                <Hr style={divider} />
                {customFields.map(([key, value]) => (
                  <React.Fragment key={key}>
                    <Text style={infoLabel}>{key}</Text>
                    <Text style={infoValue}>{value || "—"}</Text>
                  </React.Fragment>
                ))}
              </>
            )}
          </Section>
          
          <Section style={buttonSection}>
            <Link href={adminUrl} style={button}>
              View in Dashboard
            </Link>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              Sent by{" "}
              <Link href="https://github.com/0list/0list" style={footerLink}>
                0list
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AdminNotificationEmail;

// Styles
const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#141414",
  margin: "0 auto",
  padding: "40px 24px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
  border: "1px solid #262626",
};

const label = {
  color: "#737373",
  fontSize: "12px",
  fontWeight: "500",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const heading = {
  color: "#fafafa",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 32px",
};

const infoSection = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  padding: "20px",
  marginBottom: "24px",
};

const infoLabel = {
  color: "#737373",
  fontSize: "12px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const infoValue = {
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "400",
  margin: "0 0 16px",
  wordBreak: "break-all" as const,
};

const divider = {
  borderColor: "#262626",
  margin: "16px 0",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#262626",
  borderRadius: "6px",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 24px",
};

const footer = {
  borderTop: "1px solid #262626",
  paddingTop: "24px",
};

const footerText = {
  color: "#525252",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};

const footerLink = {
  color: "#525252",
  textDecoration: "underline",
};
