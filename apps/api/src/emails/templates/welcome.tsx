import {
  Body,
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

export interface WelcomeEmailProps {
  waitlistName: string;
  logoUrl?: string;
  primaryColor?: string;
  position: number;
}

export function WelcomeEmail({
  waitlistName = "Our Waitlist",
  logoUrl,
  primaryColor = "#6366f1",
  position = 47,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You're #${position} on the ${waitlistName} waitlist!`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} width="120" alt={waitlistName} style={logo} />
            </Section>
          )}
          
          <Section style={badgeSection}>
            <Text style={{ ...badge, backgroundColor: primaryColor }}>
              #{position}
            </Text>
          </Section>
          
          <Heading style={heading}>You're on the list!</Heading>
          
          <Text style={paragraph}>
            Your email has been confirmed. You're now <strong style={{ color: primaryColor }}>#{position}</strong> on the{" "}
            <strong>{waitlistName}</strong> waitlist.
          </Text>
          
          <Text style={paragraph}>
            We'll notify you as soon as it's your turn. Thanks for your patience!
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

export default WelcomeEmail;

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
  marginBottom: "24px",
};

const logo = {
  margin: "0 auto",
};

const badgeSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const badge = {
  display: "inline-block",
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "700",
  padding: "16px 32px",
  borderRadius: "12px",
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
