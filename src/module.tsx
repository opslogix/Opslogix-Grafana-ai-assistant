import React, { Suspense, lazy } from 'react';
import { AppPlugin, PluginExtensionPoints, type AppRootProps } from '@grafana/data';
import type { AppConfigProps } from './components/AppConfig/AppConfig';
import { LoadingPlaceholder } from '@grafana/ui';
import Llm from 'components/llm/Llm';

const LazyApp = lazy(() => import('./components/App/App'));
const LazyAppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

const App = (props: AppRootProps) => (
  <Suspense fallback={<LoadingPlaceholder text="" />}>
    <LazyApp {...props} />
  </Suspense>
);

const AppConfig = (props: AppConfigProps) => (
  <Suspense fallback={<LoadingPlaceholder text="" />}>
    <LazyAppConfig {...props} />
  </Suspense>
);

export const plugin = new AppPlugin<{}>().addLink({
  title: 'SCOM LLM Extension',
  description: 'SCOM LLM Extension description',
  targets: [PluginExtensionPoints.DashboardPanelMenu],
 // `event` - the `React.MouseEvent` from the click event
  // `context` - the `context` object shared with the extensions
  onClick: (event, { openModal, context }) =>
    openModal({
      title: 'AI Assistant',
      // Calling `onDismiss()` closes the modal
      body: ({ onDismiss }) => (
          <Llm context={context}/>
      ),
    }),
}).setRootPage(App).addConfigPage({
  title: 'Configuration',
  icon: 'cog',
  body: AppConfig,
  id: 'configuration',
});
