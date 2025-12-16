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

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: FormValues) {
      console.log(values);
      setEmailSent(true);
    // Integrate with your authentication logic here (e.g., NextAuth, server action).
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
        <Image
          src={"/images/logo.svg"}
          width={100}
          height={75}
          alt="logo"
          className="hidden md:block absolute ms-5 mt-5"
        />
        <Image
          src={"/images/auth/hero.png"}
          width={500}
          height={900}
          alt="hero"
          className="object-cover h-full w-full max-h-screen"
        />
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
          {!emailSent && (
            <>
              <div className="">
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Reset Password
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please enter your email to request a password reset
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
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

                  <Button
                    type="submit"
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    Login
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-munchprimary hover:text-munchprimaryDark underline"
                >
                  Back to login
                </Link>
              </p>
            </>
          )}
          {emailSent && (
            <>
              <div className="">
                <h2 className="text-2xl font-bold tracking-tight font-rubik flex gap-3">
                  <span>Email Sent!</span>
                  <Image
                    src={"/images/icon/CheckCircleSuccess.svg"}
                    width={25}
                    height={25}
                    alt="success icon"
                  />
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We have sent you an email with the reset instructions
                </p>
              </div>
              <Link href={"/login"} className="">
                <Button
                  type="submit"
                  className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full hover:cursor-pointer"
                >
                  Back to Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
