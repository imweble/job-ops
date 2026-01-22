import React, { useState, useEffect } from "react"
import { useFormContext, Controller } from "react-hook-form"

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { UpdateSettingsInput } from "@shared/settings-schema"
import type { EnvSettingsValues } from "@client/pages/settings/types"

type EnvironmentSettingsSectionProps = {
  values: EnvSettingsValues
  isLoading: boolean
  isSaving: boolean
}

const formatSecretHint = (hint: string | null) => (hint ? `${hint}********` : "Not set")

export const EnvironmentSettingsSection: React.FC<EnvironmentSettingsSectionProps> = ({
  values,
  isLoading,
  isSaving,
}) => {
  const { register, control, formState: { errors } } = useFormContext<UpdateSettingsInput>()
  const { readable, private: privateValues, basicAuthActive } = values

  const [isBasicAuthEnabled, setIsBasicAuthEnabled] = useState(basicAuthActive)

  useEffect(() => {
    setIsBasicAuthEnabled(basicAuthActive)
  }, [basicAuthActive])

  return (
    <AccordionItem value="environment" className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <span className="text-base font-semibold">Environment & Accounts</span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-8">
          {/* External Services */}
          <div className="space-y-4">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">External Services</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">OpenRouter API key</div>
                <Input
                  {...register("openrouterApiKey")}
                  type="password"
                  placeholder="Enter new key"
                  disabled={isLoading || isSaving}
                />
                {errors.openrouterApiKey && <p className="text-xs text-destructive">{errors.openrouterApiKey.message}</p>}
                <div className="text-xs text-muted-foreground">
                  Current: <span className="font-mono">{formatSecretHint(privateValues.openrouterApiKeyHint)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Webhook secret</div>
                <Input
                  {...register("webhookSecret")}
                  type="password"
                  placeholder="Enter new secret"
                  disabled={isLoading || isSaving}
                />
                {errors.webhookSecret && <p className="text-xs text-destructive">{errors.webhookSecret.message}</p>}
                <div className="text-xs text-muted-foreground">
                  Current: <span className="font-mono">{formatSecretHint(privateValues.webhookSecretHint)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Accounts */}
          <div className="space-y-6">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Service Accounts</div>
            
            <div className="space-y-4">
              <div className="text-sm font-semibold">RxResume</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm">Email</div>
                  <Input
                    {...register("rxresumeEmail")}
                    placeholder="you@example.com"
                    disabled={isLoading || isSaving}
                  />
                  {errors.rxresumeEmail && <p className="text-xs text-destructive">{errors.rxresumeEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="text-sm">Password</div>
                  <Input
                    {...register("rxresumePassword")}
                    type="password"
                    placeholder="Enter new password"
                    disabled={isLoading || isSaving}
                  />
                  {errors.rxresumePassword && <p className="text-xs text-destructive">{errors.rxresumePassword.message}</p>}
                  <div className="text-xs text-muted-foreground">
                    Current: <span className="font-mono">{formatSecretHint(privateValues.rxresumePasswordHint)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">UKVisaJobs</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm">Email</div>
                  <Input
                    {...register("ukvisajobsEmail")}
                    placeholder="you@example.com"
                    disabled={isLoading || isSaving}
                  />
                  {errors.ukvisajobsEmail && <p className="text-xs text-destructive">{errors.ukvisajobsEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="text-sm">Password</div>
                  <Input
                    {...register("ukvisajobsPassword")}
                    type="password"
                    placeholder="Enter new password"
                    disabled={isLoading || isSaving}
                  />
                  {errors.ukvisajobsPassword && <p className="text-xs text-destructive">{errors.ukvisajobsPassword.message}</p>}
                  <div className="text-xs text-muted-foreground">
                    Current: <span className="font-mono">{formatSecretHint(privateValues.ukvisajobsPasswordHint)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security */}
          <div className="space-y-4">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Security</div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="enableBasicAuth"
                checked={isBasicAuthEnabled}
                onCheckedChange={(checked) => setIsBasicAuthEnabled(checked === true)}
                disabled={isLoading || isSaving}
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="enableBasicAuth"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Enable basic authentication
                </label>
                <p className="text-xs text-muted-foreground">
                  Require a username and password for write operations.
                </p>
              </div>
            </div>

            {isBasicAuthEnabled && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <div className="text-sm">Username</div>
                  <Input
                    {...register("basicAuthUser")}
                    placeholder="username"
                    disabled={isLoading || isSaving}
                  />
                  {errors.basicAuthUser && <p className="text-xs text-destructive">{errors.basicAuthUser.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Password</div>
                  <Input
                    {...register("basicAuthPassword")}
                    type="password"
                    placeholder="Enter new password"
                    disabled={isLoading || isSaving}
                  />
                  {errors.basicAuthPassword && <p className="text-xs text-destructive">{errors.basicAuthPassword.message}</p>}
                  <div className="text-xs text-muted-foreground">
                    Current: <span className="font-mono">{formatSecretHint(privateValues.basicAuthPasswordHint)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

