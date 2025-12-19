"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";

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
import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    console.log(values);
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500));
    // Integrate with your authentication logic here (e.g., NextAuth, server action).
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
              <div className="fixed w-1/2 pe-5">
                <Image
                  src={"/images/logo.svg"}
                  width={100}
                  height={75}
                  alt="logo"
                  className="hidden md:block absolute z-20 ms-5 mt-5"
                />
                <Image
                  src={"/images/auth/hero.png"}
                  width={500}
                  height={900}
                  alt="hero"
                  className="object-cover h-full max-h-screen w-full"
                />
              </div>
            </div>

      {/* Right Side: Login Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md space-y-8">
          <Image
            src={"/images/logo.svg"}
            width={100}
            height={75}
            alt="logo"
            className="lg:hidden"
          />
          <div className="">
            <h2 className="text-2xl font-bold tracking-tight font-rubik">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in to continue.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="flex items-center font-normal text-slate-500"
                    >
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

                        {!showPassword ? (
                          <Eye
                            className="absolute right-0 top-1/2 -translate-1/2 text-slate-500"
                            onClick={() => setShowPassword(true)}
                          />
                        ) : (
                          <EyeOff
                            className="absolute right-0 top-1/2 -translate-1/2 text-slate-500"
                            onClick={() => setShowPassword(false)}
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
              >
                {isLoading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Login"
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
        </div>
      </div>
    </div>
  );
}
