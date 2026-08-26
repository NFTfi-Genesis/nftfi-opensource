declare module '@nftfi/js'

declare module '*.svg' {
  import React from 'react'

  const SVG: React.FC<React.SVGProps<SVGSVGElement>>
  export default SVG
}

declare module 'jazzicon' {
  export default function jazzicon(
    diameter: number,
    seed: number
  ): HTMLDivElement
}

declare module 'vitest/config' {
  interface VitestConfig {
    resolve?: {
      alias?: Record<string, string>
    }
    test?: {
      globals?: boolean
      environment?: string
      include?: string[]
      // Add other config properties as needed
    }
    // Add other top-level config properties as needed
  }
  export const defineConfig: (config: VitestConfig) => VitestConfig
}

declare module 'zod-validation-error' {
  export function fromError(
    error: unknown,
    options?: ValidationErrorOptions
  ): ValidationError
}

declare module 'simplebar-react' {
  import * as React from 'react'

  export interface SimpleBarProps extends React.HTMLAttributes<HTMLDivElement> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  const SimpleBar: React.FC<SimpleBarProps>
  export default SimpleBar
}

declare module 'dynamic-widget-context' {
  export function useWidgetContext(): {
    setDynamicWidgetView: (view: UserProfileSection) => void
  }
}
