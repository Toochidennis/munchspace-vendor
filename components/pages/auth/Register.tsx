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
  setDisplayName,
} from "@/app/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// Registration schema (updated to include phone)
const registerSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    phone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 characters." })
      .regex(/^\+?\d+$/, { message: "Invalid phone number format." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, {
        message: "Must contain at least one uppercase letter (A-Z).",
      })
      .regex(/[0-9]/, { message: "Must contain at least one number (0-9)." })
      .regex(/[^a-zA-Z0-9]/, {
        message:
          "Must contain at least one special character (not a letter or number).",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const SERVER_ERROR_MESSAGE = "Something went wrong try again later";

async function parseApiResponse(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [currentWaitTime, setCurrentWaitTime] = useState(60);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
  const password = form.watch("password");

  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const strength =
    (hasLength ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0);
  const strengthLabels = ["Too Weak", "Weak", "Fair", "Good", "Strong"];

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

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
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, idx) => {
      if (idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // ── New helper: request OTP ───────────────────────────────────────
  async function requestOtp(email?: string) {
    const identifier = email || savedEmail;
    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ identifier }),
      });

      if (res.status >= 500) {
        setOtpError(SERVER_ERROR_MESSAGE);
        return false;
      }

      if (!res.ok) {
        const err = (await parseApiResponse(res)) || {};
        console.warn("OTP request failed:", err.message || res.status);
        return false;
      } else {
        setResendCooldown(60);
        setCurrentWaitTime(60);
        setOtp(["", "", "", "", "", ""]);
        return true;
      }
    } catch (err) {
      console.warn("OTP request network error", err);
      return false;
    }
  }

  async function onRegisterSubmit(values: RegisterValues) {
    setIsLoading(true);

    let normalizedPhone = values.phone.trim();
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+234" + normalizedPhone;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: normalizedPhone,
          password: values.password,
        }),
      });

      if (response.status >= 500) {
        form.setError("root", {
          message: SERVER_ERROR_MESSAGE,
        });
        return;
      }

      const resData = await parseApiResponse(response);

      if (response.status === 201 && resData?.success && resData?.data) {
        setSavedEmail(values.email);

        if (resData.data.requiresOtp) {
          // ── Changed: request OTP before showing the screen ────────
          await requestOtp(values.email);
          setStep(2);
        } else {
          const { accessToken, refreshToken } = resData.data;

          if (resData.data.vendor?.businessId) {
            setBusinessId(resData.data.vendor.businessId);
            hasBusiness(true);
          } else {
            setBusinessId(null);
            hasBusiness(null);
          }
          if (resData.data.firstName) setFirstName(resData.data.firstName);
          if (resData.data.displayName)
            setDisplayName(resData.data.displayName);
          setAccessToken(accessToken);
          document.cookie = `refreshToken=${refreshToken}; path=/; secure; samesite=strict; max-age=${
            60 * 60 * 24 * 30
          }`;

          setStep(3);
        }
      } else if (response.status === 400) {
        form.setError("root", {
          message: resData?.message || "Invalid input data.",
        });
      } else if (response.status === 401) {
        form.setError("root", { message: "Invalid or missing API key." });
      } else if (response.status === 409) {
        form.setError("email", { message: "User already exists." });
      } else {
        form.setError("root", {
          message: resData?.message || "An unexpected error occurred.",
        });
      }
    } catch (error) {
      form.setError("root", { message: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setOtpError("");

    const otpRequested = await requestOtp();

    if (!otpRequested && !otpError) {
      // If request failed and didn't set cooldown → show error
      setOtpError("Failed to resend code. Please try again.");
    }

    setIsLoading(false);
  }

  async function onOtpSubmit() {
    const code = otp.join("");
    if (code.length !== 6) return;

    setIsLoading(true);
    setOtpError("");

    try {
      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: savedEmail,
          otp: code,
        }),
      });

      if (response.status >= 500) {
        setOtpError(SERVER_ERROR_MESSAGE);
        return;
      }

      if (response.status === 200) {
        const res = await parseApiResponse(response);

        console.log("OTP verification response:", res);
        if (!res?.data) {
          setOtpError("An error occurred during verification.");
          return;
        }

        const { accessToken, refreshToken } = res.data;

        if (res.data.vendor?.businessId) {
          setBusinessId(res.data.vendor.businessId);
          hasBusiness(true);
        } else {
          setBusinessId(null);
          hasBusiness(null);
        }
        if (res.data.firstName) setFirstName(res.data.firstName);
        if (res.data.displayName) setDisplayName(res.data.displayName);
        setAccessToken(accessToken);
        document.cookie = `refreshToken=${refreshToken}; path=/; secure; samesite=strict; max-age=${
          60 * 60 * 24 * 30
        }`;

        window.location.href = "/restaurant/dashboard";
      } else if (response.status === 400) {
        setOtpError("Invalid or expired OTP.");
      } else {
        setOtpError("An error occurred during verification.");
      }
    } catch (error) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="hidden md:block absolute z-20 ms-5 mt-5"
            />
          </Link>
          <Image
            src={"/images/auth/hero.png"}
            width={500}
            height={900}
            alt="hero"
            className="object-cover h-full max-h-screen w-full"
          />
        </div>
      </div>

      {/* Right Side: Multi-Step Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md space-y-8 my-20">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="lg:hidden"
            />
          </Link>

          {step === 1 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fill in your details to get started.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onRegisterSubmit)}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            First Name
                            <span className="-ms-1 pt-1 text-xl text-munchred">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First name"
                              className="h-12 placeholder:text-gray-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            Last Name
                            <span className="-ms-1 pt-1 text-xl text-munchred">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Last name"
                              className="h-12 placeholder:text-gray-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Email
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Email"
                            type="email"
                            className="h-12 placeholder:text-gray-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Phone Number
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Phone number"
                            className="h-12 placeholder:text-gray-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
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

                        <div className="mt-2">
                          <p className="text-sm font-medium text-slate-700">
                            Password Strength: {strengthLabels[strength]}
                          </p>
                        </div>

                        <ul className="mt-4 space-y-1 text-sm text-slate-500">
                          <li className="flex items-center gap-2">
                            {hasLength ? (
                              <Image
                                src={"/images/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 8 characters
                          </li>
                          <li className="flex items-center gap-2">
                            {hasUppercase ? (
                              <Image
                                src={"/images/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 uppercase character (A-Z)
                          </li>
                          <li className="flex items-center gap-2">
                            {hasNumber ? (
                              <Image
                                src={"/images/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 number (0-9)
                          </li>
                          <li className="flex items-center gap-2">
                            {hasSpecial ? (
                              <Image
                                src={"/images/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 special character (e.g., ! @ # $ % ^ & *
                            etc.)
                          </li>
                        </ul>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Confirm Password
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Confirm Password"
                              className="h-12 placeholder:text-gray-400"
                              type={showConfirmPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                              {showConfirmPassword ? (
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

                  {form.formState.errors.root && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.root.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || strength < 4}
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-munchprimary hover:text-munchprimaryDark hover:underline"
                >
                  Login
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Verify your email
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the verification code sent to {savedEmail}
                </p>
              </div>
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
                    ? `Resend OTP in ${formatTime(resendCooldown)}`
                    : "Resend OTP"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik flex items-center gap-3">
                  <span>Welcome Onboard!</span>
                  <Image
                    src={"/images/CheckCircleSuccess.svg"}
                    width={25}
                    height={25}
                    alt="success icon"
                  />
                </h2>
                <p className="mt-2 text-sm text-muted-foreground mx-auto">
                  Let’s get you started and setup your store.
                </p>
              </div>

              <Link href="/setup-your-store" className="block">
                <Button className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full">
                  Continue to setup store
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
