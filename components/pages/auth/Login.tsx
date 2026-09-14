"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, LoaderCircle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { startSession } from "@/app/lib/session";
import { postLoginTarget } from "@/app/lib/return-to";
import {
  hasBusiness,
  setAccessToken,
  setBusinessId,
  setFirstName,
  setDisplayName,
  setRefreshToken,
} from "@/app/lib/auth";
import {
  isComplete,
  requestCode,
  startLogin,
  submitCode,
  submitPassword,
  type AuthSessionState,
} from "@/app/lib/auth-session";

// ── Schemas ────────────────────────────────────────────────
const emailSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Please enter your password."),
});

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const SERVER_ERROR_MESSAGE = "Something went wrong try again later";

function maskIdentifier(identifier: string) {
  if (!identifier) return "";
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }
  // For phone numbers
  if (identifier.length >= 6) {
    return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
  }
  return "***";
}

// ── Component ──────────────────────────────────────────────
export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  // Use useRef to store identifier persistently across renders
  const identifierRef = useRef<string>("");

  // The session this sign-in belongs to. Every step after the first names it,
  // so the server never has to work out from the account which flow is in
  // progress — that guesswork is what used to strand people mid-login.
  const sessionRef = useRef<string>("");

  const [savedIdentifier, setSavedIdentifier] = useState(""); // kept for UI display
  const [noPasswordMessage, setNoPasswordMessage] = useState("");
  const [otpError, setOtpError] = useState("");

  const [resendCooldown, setResendCooldown] = useState(0);
  const [currentWaitTime, setCurrentWaitTime] = useState(60);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { identifier: "" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // OTP handlers (unchanged)
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) {
      onOtpSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;

    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    const next = Math.min(pasted.length, 5);
    otpRefs.current[next]?.focus();
  };

  // ── Core Fix: Centralized identifier setter ─────────────────────
  const saveIdentifier = useCallback((identifier: string) => {
    identifierRef.current = identifier;
    setSavedIdentifier(identifier);
  }, []);

  // Get current identifier safely (prefers ref)
  const getIdentifier = useCallback((): string => {
    return identifierRef.current || savedIdentifier;
  }, [savedIdentifier]);

  async function onEmailSubmit(values: EmailValues) {
    setIsLoading(true);
    setNoPasswordMessage("");
    setOtpError("");
    setAuthError("");

    const result = await startLogin(values.identifier);

    setIsLoading(false);

    if (!result.ok) {
      emailForm.setError("root", { message: result.message });
      return;
    }

    const state = result.data;

    if (!state.sessionToken) {
      emailForm.setError("root", {
        message: "Unexpected response from server. Please try again.",
      });
      return;
    }

    sessionRef.current = state.sessionToken;
    saveIdentifier(values.identifier);

    await advance(state);
  }

  /**
   * Renders whatever the server says comes next.
   *
   * The screen deliberately holds no opinion about the order of the steps. If
   * the server starts asking for something else — a code where it used to take
   * a password, a provider sign-in — this follows it without a release.
   */
  async function advance(state: AuthSessionState) {
    if (isComplete(state)) {
      completeSignIn(state);
      return;
    }

    const { availableFactors } = state.next;

    if (availableFactors.includes("PASSWORD")) {
      setStep("password");
      return;
    }

    if (availableFactors.includes("OTP")) {
      await requestOtp();
      setStep("otp");
      return;
    }

    emailForm.setError("root", {
      message: "No supported authentication method available.",
    });
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setIsLoading(true);
    setAuthError("");

    if (!sessionRef.current) {
      passwordForm.setError("root", {
        message:
          "Session error. Please go back and enter your email/phone again.",
      });
      setIsLoading(false);
      return;
    }

    const result = await submitPassword(sessionRef.current, values.password);

    setIsLoading(false);

    if (!result.ok) {
      passwordForm.setError("root", { message: result.message });
      return;
    }

    await advance(result.data);
  }

  async function requestOtp() {
    if (!sessionRef.current) {
      setOtpError("Session expired. Please go back and try again.");
      return;
    }

    const result = await requestCode(sessionRef.current);

    if (!result.ok) {
      setOtpError(result.message);
      return;
    }

    setResendCooldown(60);
    setCurrentWaitTime(60);
    setOtp(["", "", "", "", "", ""]);
  }

  async function onOtpSubmit() {
    const code = otp.join("");
    if (code.length !== 6) return;

    if (!sessionRef.current) {
      setOtpError("Session error. Please restart the login process.");
      return;
    }

    setIsLoading(true);
    setOtpError("");

    const result = await submitCode(sessionRef.current, code);

    setIsLoading(false);

    if (!result.ok) {
      setOtpError(result.message);
      return;
    }

    if (!isComplete(result.data)) {
      // More to prove before tokens are issued — follow the server rather than
      // assuming the code was the last step.
      await advance(result.data);
      return;
    }

    completeSignIn(result.data);
  }

  function completeSignIn(
    data: AuthSessionState & { accessToken: string; refreshToken: string },
  ) {
    // Signing in is the one moment the session clock starts. Refreshing later
    // never resets it, so the session ends a fixed time after sign-in.
    startSession();
    setAccessToken(data.accessToken);

    // Save display name and first name
    if (data.displayName) {
      setDisplayName(data.displayName);
    }
    if (data.firstName) {
      setFirstName(data.firstName);
    }

    setRefreshToken(data.refreshToken);

    if (data.vendor?.hasBusiness && data.vendor?.businessId) {
      setBusinessId(data.vendor.businessId);
      hasBusiness(true);
    } else {
      setBusinessId(null);
      hasBusiness(null);
    }

    localStorage.setItem("admin", JSON.stringify(!!data.admin));
    localStorage.setItem("customer", JSON.stringify(!!data.customer));



    // Falls back to the dashboard when nothing was queued, which is every
    // login that did not start from a deep link.
    window.location.href = postLoginTarget();
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setOtpError("");
    await requestOtp();
    setIsLoading(false);
  }

  // ── Render (UI remains mostly the same) ─────────────────────
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: Hero Image - unchanged */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Link href="/">
            <Image
              src="/images/logo.svg"
              width={100}
              height={75}
              alt="logo"
              className="hidden md:block absolute z-20 ms-5 mt-5"
            />
          </Link>
          <Image
            src="/images/auth/hero.png"
            width={500}
            height={900}
            alt="hero"
            className="object-cover h-full max-h-screen w-full"
          />
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/">
            <Image
              src="/images/logo.svg"
              width={100}
              height={75}
              alt="logo"
              className="md:hidden"
            />
          </Link>

          {/* EMAIL STEP */}
          {step === "email" && (
            /* ... same as before ... */
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={emailForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Email / Phone number
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email / Phone number"
                          className="h-12 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {noPasswordMessage && (
                  <p className="text-sm text-amber-600 text-center pt-2">
                    {noPasswordMessage}
                  </p>
                )}

                {emailForm.formState.errors.root && (
                  <p className="text-sm text-red-500 text-center">
                    {emailForm.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                >
                  {isLoading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-munchprimary underline underline-offset-4 hover:text-munchprimaryDark"
                  >
                    Sign up
                  </Link>
                </p>
              </form>
            </Form>
          )}

          {/* PASSWORD STEP - uses savedIdentifier for display */}
          {step === "password" && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="mb-4 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Enter your password
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  for {maskIdentifier(savedIdentifier) || "your account"}
                </p>
              </div>
              {/* Rest of password form remains the same */}
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-6"
                >
                  {/* ... password field unchanged ... */}
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center font-normal text-slate-500">
                          Password
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Password"
                              className="h-12 placeholder:text-gray-400"
                              type={showPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                              {showPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {passwordForm.formState.errors.root && (
                    <p className="text-sm text-red-500 text-center">
                      {passwordForm.formState.errors.root.message}
                    </p>
                  )}

                  <div className="flex items-center justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium underline text-munchprimary hover:text-munchprimaryDark hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* OTP STEP */}
          {step === "otp" && (
            <div className="space-y-8">
              <div>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="mb-4 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Verify your account
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the code sent to {maskIdentifier(savedIdentifier) || "your account"}
                </p>
              </div>

              {/* OTP inputs remain unchanged */}
              <div className="grid grid-cols-6 justify-between gap-3">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 text-center text-lg"
                    maxLength={1}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-500 text-center">{otpError}</p>
              )}

              <Button
                onClick={onOtpSubmit}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
              >
                {isLoading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-munchprimary hover:text-munchprimaryDark p-0 h-auto font-medium"
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatTime(resendCooldown)}`
                    : "Resend code"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
