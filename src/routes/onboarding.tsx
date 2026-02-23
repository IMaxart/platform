import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Header } from '~/components/layout/header'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  getAiSetupGuide,
  getEnvTemplate,
  getInstallCommand,
  getNextJsSnippet,
  getTanStackStartSnippet,
  getVanillaJsSnippet,
  getViteReactSnippet,
} from '~/lib/onboarding-templates'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const STEPS = [
  'welcome',
  'install',
  'configure',
  'env',
  'ai-guide',
  'verify',
] as const
type CopyButtonProps = {
  copiedField: null | string
  copiedLabel: string
  copyLabel: string
  field: string
  onCopy: (text: string, field: string) => void
  text: string
}

type Step = (typeof STEPS)[number]

const CopyButton = ({
  copiedField,
  copiedLabel,
  copyLabel,
  field,
  onCopy,
  text,
}: CopyButtonProps) => (
  <Button
    className="shrink-0"
    onClick={() => {
      onCopy(text, field)
    }}
    size="sm"
    variant="outline"
  >
    {copiedField === field ? (
      <Check className="mr-1 h-3 w-3 text-green-500" />
    ) : (
      <ClipboardCopy className="mr-1 h-3 w-3" />
    )}
    {copiedField === field ? copiedLabel : copyLabel}
  </Button>
)

type CodeBlockProps = {
  code: string
  copiedField: null | string
  copiedLabel: string
  copyLabel: string
  field: string
  onCopy: (text: string, field: string) => void
}

const CodeBlock = ({
  code,
  copiedField,
  copiedLabel,
  copyLabel,
  field,
  onCopy,
}: CodeBlockProps) => (
  <div className="relative">
    <div className="absolute top-2 right-2">
      <CopyButton
        copiedField={copiedField}
        copiedLabel={copiedLabel}
        copyLabel={copyLabel}
        field={field}
        onCopy={onCopy}
        text={code}
      />
    </div>
    <pre className="bg-muted overflow-x-auto rounded-md p-4 pr-28 font-mono text-sm">
      <code>{code}</code>
    </pre>
  </div>
)

function OnboardingPage() {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [copiedField, setCopiedField] = useState<null | string>(null)

  const domain = window.location.hostname
  const stepIndex = STEPS.indexOf(currentStep)

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => {
      setCopiedField(null)
    }, 2000)
  }

  const copyLabel = t('settings.copySnippet')
  const copiedLabel = t('settings.copied')

  const copyProps = {
    copiedField,
    copiedLabel,
    copyLabel,
    onCopy: handleCopy,
  }

  const goNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex]
      if (nextStep) setCurrentStep(nextStep)
    }
  }

  const goPrev = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      const prevStep = STEPS[prevIndex]
      if (prevStep) setCurrentStep(prevStep)
    }
  }

  return (
    <>
      <Header title={t('onboarding.title')} />
      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div className="flex items-center gap-2" key={step}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    i < stepIndex
                      ? 'bg-primary text-primary-foreground'
                      : i === stepIndex
                        ? 'bg-primary text-primary-foreground ring-primary ring-2 ring-offset-2'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px w-6 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`}
                  />
                )}
              </div>
            ))}
          </div>

          {currentStep === 'welcome' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.welcomeTitle')}</CardTitle>
                <CardDescription>
                  {t('onboarding.welcomeDescription', { domain })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {t('onboarding.welcomeBody')}
                </p>
              </CardContent>
            </Card>
          )}

          {currentStep === 'install' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.installTitle')}</CardTitle>
                <CardDescription>
                  {t('onboarding.installDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock
                  {...copyProps}
                  code={getInstallCommand()}
                  field="install"
                />
                <p className="text-muted-foreground text-sm">
                  {t('onboarding.installAlternative')}
                </p>
                <CodeBlock
                  {...copyProps}
                  code={getVanillaJsSnippet({ domain })}
                  field="script-tag"
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'configure' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.configureTitle')}</CardTitle>
                <CardDescription>
                  {t('onboarding.configureDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tanstack">
                  <TabsList className="mb-4">
                    <TabsTrigger value="tanstack">TanStack Start</TabsTrigger>
                    <TabsTrigger value="nextjs">Next.js</TabsTrigger>
                    <TabsTrigger value="vite">Vite + React</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tanstack">
                    <CodeBlock
                      {...copyProps}
                      code={getTanStackStartSnippet({ domain })}
                      field="tanstack"
                    />
                  </TabsContent>
                  <TabsContent value="nextjs">
                    <CodeBlock
                      {...copyProps}
                      code={getNextJsSnippet({ domain })}
                      field="nextjs"
                    />
                  </TabsContent>
                  <TabsContent value="vite">
                    <CodeBlock
                      {...copyProps}
                      code={getViteReactSnippet({ domain })}
                      field="vite"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {currentStep === 'env' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.envTitle')}</CardTitle>
                <CardDescription>
                  {t('onboarding.envDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  {...copyProps}
                  code={getEnvTemplate({ domain })}
                  field="env"
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'ai-guide' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.aiGuideTitle')}</CardTitle>
                <CardDescription>
                  {t('onboarding.aiGuideDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t('onboarding.aiGuideBody')}
                </p>
                <div className="flex gap-2">
                  <CopyButton
                    {...copyProps}
                    field="ai-guide"
                    text={getAiSetupGuide({ domain })}
                  />
                  <Button
                    onClick={() => {
                      const blob = new Blob([getAiSetupGuide({ domain })], {
                        type: 'text/markdown',
                      })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'analytics-setup-guide.md'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    {t('onboarding.downloadGuide')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'verify' && <VerifyStep domain={domain} />}

          <div className="flex justify-between">
            <Button
              disabled={stepIndex === 0}
              onClick={goPrev}
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('common.previous')}
            </Button>
            {stepIndex < STEPS.length - 1 && (
              <Button onClick={goNext}>
                {t('common.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function VerifyStep({ domain }: { domain: string }) {
  const { t } = useTranslation()

  const verification = useQuery({
    queryFn: async () => {
      const response = await fetch(`https://${domain}/api/health`)
      if (!response.ok) return { connected: false }
      const data = (await response.json()) as { ok: boolean }
      return { connected: data.ok }
    },
    queryKey: ['onboarding-verify', domain],
    refetchInterval: 5000,
  })

  const isConnected = verification.data?.connected ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.verifyTitle')}</CardTitle>
        <CardDescription>{t('onboarding.verifyDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          )}
          <span className="text-sm">
            {isConnected
              ? t('onboarding.verifySuccess')
              : t('onboarding.verifyWaiting')}
          </span>
        </div>
        {isConnected && (
          <Button asChild variant="default">
            <a href="/">{t('onboarding.goToDashboard')}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
