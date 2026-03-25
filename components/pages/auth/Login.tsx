"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
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

// ── Handlers ───────────────────────────────────────────────

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedIdentifier, setSavedIdentifier] = useState("");
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

      // ── Important: check HTTP status first ───────────────────────
      if (res.status === 401) {
        emailForm.setError("root", {
          message: "No account found with this email or phone number.",
        });
        setIsLoading(false);
        return;
      }

      const apiRes = await res.json();

      if (!apiRes.success || !apiRes.data) {
        let errorMessage =
          apiRes.message || "An unexpected error occurred. Please try again.";

        // Optional: refine other common backend messages if needed
        if (apiRes.message?.toLowerCase().includes("invalid")) {
          errorMessage = "Please enter a valid email address or phone number.";
        }

        emailForm.setError("root", { message: errorMessage });
        return;
      }

      const data = apiRes.data;
      setSavedIdentifier(values.identifier);

      // New auth flow logic based on response structure
      if (data.availableMethods) {
        // Response contains availableMethods → multi-step selection
        if (data.availableMethods.includes("password")) {
          setStep("password");
        } else if (data.availableMethods.includes("otp")) {
          // Only OTP available → request OTP directly and go to OTP screen
          await requestOtp();
          setStep("otp");
        } else {
          // Fallback
          emailForm.setError("root", {
            message: "No supported authentication method available.",
          });
        }
      } else {
        // No availableMethods → direct token response (login immediately)
        if (data.accessToken && data.refreshToken) {
          completeSignIn(data);
        } else if (!data.hasPassword) {
          setNoPasswordMessage(
            "You were registered as a customer. Please reset your password to set a new one.",
          );
        } else {
          // Fallback for unexpected structure
          emailForm.setError("root", {
            message: "Unexpected response from server. Please try again.",
          });
        }
      }
    } catch (err) {
      emailForm.setError("root", {
        message:
          "Unable to connect to the server. Please check your internet connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: savedIdentifier,
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

      // After password, check structure for next action
      if (data.availableMethods) {
        if (data.availableMethods.includes("otp")) {
          await requestOtp();
          setStep("otp");
        } else {
          // No further OTP required
          completeSignIn(data);
        }
      } else if (data.accessToken && data.refreshToken) {
        completeSignIn(data);
      } else if (data.requiresOtp) {
        await requestOtp();
        setStep("otp");
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
    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ identifier: savedIdentifier }),
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
          identifier: savedIdentifier,
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

    document.cookie = `refreshToken=${data.refreshToken}; path=/; secure; samesite=strict; max-age=${60 * 60 * 24 * 30}`;

    if (data.vendor?.hasBusiness) {
      setBusinessId(data.vendor.businessId);
      hasBusiness(true);
    } else {
      hasBusiness(null);
    }

    // If firstName is available in any response:
    // setFirstName(data.vendor?.firstName || "");

    window.location.href = "/restaurant/dashboard";
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setOtpError("");

    await requestOtp();

    setIsLoading(false);
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: Hero Image */}
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
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Welcome back!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please sign in to continue.
                </p>
              </div>

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

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium underline text-munchprimary hover:text-munchprimaryDark hover:underline"
                >
                  Signup
                </Link>
              </p>
            </>
          )}

          {/* PASSWORD STEP */}
          {step === "password" && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Enter your password
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  for {savedIdentifier}
                </p>
              </div>

              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-6"
                >
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
                  Enter the code sent to {savedIdentifier}
                </p>
              </div>

              <div className="grid grid-cols-6 justify-between gap-3">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {otpRefs.current[index] = el}}
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