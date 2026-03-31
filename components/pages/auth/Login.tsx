"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

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
import {
  hasBusiness,
  setAccessToken,
  setBusinessId,
  setFirstName,
  setDisplayName,
} from "@/app/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// ── Schemas ────────────────────────────────────────────────
const emailSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Please enter your password."),
});

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ── Component ──────────────────────────────────────────────
export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use useRef to store identifier persistently across renders
  const identifierRef = useRef<string>("");

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

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ identifier: values.identifier }),
      });

      if (res.status === 401) {
        emailForm.setError("root", {
          message: "No account found with this email or phone number.",
        });
        return;
      }

      const apiRes = await res.json();

      if (!apiRes.success || !apiRes.data) {
        const errorMessage = apiRes.message?.toLowerCase().includes("invalid")
          ? "Please enter a valid email address or phone number."
          : apiRes.message || "An unexpected error occurred. Please try again.";

        emailForm.setError("root", { message: errorMessage });
        return;
      }

      const data = apiRes.data;

      // *** IMPORTANT: Save identifier immediately ***
      saveIdentifier(values.identifier);

      if (data.availableMethods) {
        if (data.availableMethods.includes("password")) {
          setStep("password");
        } else if (data.availableMethods.includes("otp")) {
          await requestOtp();
          setStep("otp");
        } else {
          emailForm.setError("root", {
            message: "No supported authentication method available.",
          });
        }
      } else if (data.accessToken && data.refreshToken) {
        completeSignIn(data);
      } else if (!data.hasPassword) {
        setNoPasswordMessage(
          "You were registered as a customer. Please reset your password to set a new one.",
        );
      } else {
        emailForm.setError("root", {
          message: "Unexpected response from server. Please try again.",
        });
      }
    } catch (err) {
      emailForm.setError("root", {
        message:
          "Unable to connect to the server. Please check your internet connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setIsLoading(true);

    const currentIdentifier = getIdentifier();

    if (!currentIdentifier) {
      passwordForm.setError("root", {
        message:
          "Session error. Please go back and enter your email/phone again.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: currentIdentifier,
          password: values.password,
        }),
      });

      const apiRes = await res.json();

      if (!apiRes.success || !apiRes.data) {
        passwordForm.setError("root", {
          message: apiRes.message || "Incorrect password. Please try again.",
        });
        return;
      }

      const data = apiRes.data;

      if (data.availableMethods?.includes("otp") || data.requiresOtp) {
        await requestOtp();
        setStep("otp");
      } else if (data.accessToken && data.refreshToken) {
        completeSignIn(data);
      } else {
        completeSignIn(data);
      }
    } catch {
      passwordForm.setError("root", {
        message: "Network error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function requestOtp() {
    const currentIdentifier = getIdentifier();

    if (!currentIdentifier) {
      setOtpError("Session expired. Please go back and try again.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ identifier: currentIdentifier }),
      });

      const apiRes = await res.json();

      if (!apiRes.success) {
        setOtpError(apiRes.message || "Failed to send verification code.");
      } else {
        setResendCooldown(60);
        setCurrentWaitTime(60);
        setOtp(["", "", "", "", "", ""]);
      }
    } catch {
      setOtpError("Failed to request verification code. Please try again.");
    }
  }

  async function onOtpSubmit() {
    const code = otp.join("");
    if (code.length !== 6) return;

    const currentIdentifier = getIdentifier();
    if (!currentIdentifier) {
      setOtpError("Session error. Please restart the login process.");
      return;
    }

    setIsLoading(true);
    setOtpError("");

    try {
      const res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: currentIdentifier,
          otp: code,
        }),
      });

      const apiRes = await res.json();

      if (!apiRes.success || !apiRes.data) {
        setOtpError(
          apiRes.message ||
            "Invalid or expired code. Please check and try again.",
        );
        return;
      }

      completeSignIn(apiRes.data);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function completeSignIn(data: any) {
    if (!data.accessToken || !data.refreshToken) {
      console.warn("Missing tokens in final response");
      return;
    }

    setAccessToken(data.accessToken);

    // Save display name and first name
    if (data.displayName) {
      setDisplayName(data.displayName);
    }
    if (data.firstName) {
      setFirstName(data.firstName);
    }

    document.cookie = `refreshToken=${data.refreshToken}; path=/; secure; samesite=strict; max-age=${60 * 60 * 24 * 30}`;

    if (data.vendor?.hasBusiness) {
      setBusinessId(data.vendor.businessId);
      // hasBusiness(true);
    }
    // else {
    //   hasBusiness(null);
    // }
    console.log("Vendor data on login:", data);

    window.location.href = "/restaurant/dashboard";
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
              </form>
            </Form>
          )}

          {/* PASSWORD STEP - uses savedIdentifier for display */}
          {step === "password" && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Enter your password
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  for {savedIdentifier || "your account"}
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
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Verify your account
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the code sent to {savedIdentifier || "your account"}
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
