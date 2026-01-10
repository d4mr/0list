import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface ConfirmationEmailProps {
  waitlistName: string;
  logoUrl?: string;
  primaryColor?: string;
  confirmationUrl: string;
  position: number;
}

export function ConfirmationEmail({
  waitlistName = "Our Waitlist",
  logoUrl,
  primaryColor = "#6366f1",
  confirmationUrl = "https://example.com/confirm",
  position = 47,
}: ConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your spot on the {waitlistName} waitlist</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} width="120" alt={waitlistName} style={logo} />
            </Section>
          )}
          
          <Heading style={heading}>Confirm your email</Heading>
          
          <Text style={paragraph}>
            Thanks for signing up for the <strong>{waitlistName}</strong> waitlist!
            Please confirm your email address to secure your spot.
          </Text>
          
          <Text style={positionText}>
            You'll be <strong style={{ color: primaryColor }}>#{position}</strong> on the waitlist.
          </Text>
          
          <Section style={buttonSection}>
            <Button style={{ ...button, backgroundColor: primaryColor }} href={confirmationUrl}>
              Confirm my email
            </Button>
          </Section>
          
          <Text style={smallText}>
            If you didn't sign up for this waitlist, you can safely ignore this email.
          </Text>
          
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by {waitlistName}. Powered by{" "}
              <Link href="https://github.com/d4mr/0list" style={footerLink}>
                0list
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ConfirmationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logo = {
  margin: "0 auto",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const positionText = {
  color: "#4a4a4a",
  fontSize: "18px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const button = {
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const smallText = {
  color: "#8a8a8a",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};

const footer = {
  borderTop: "1px solid #e6e6e6",
  marginTop: "32px",
  paddingTop: "24px",
};

const footerText = {
  color: "#8a8a8a",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};

const footerLink = {
  color: "#8a8a8a",
  textDecoration: "underline",
};
