import React, { ChangeEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import { AppPluginMeta, GrafanaTheme2, PluginConfigPageProps, PluginMeta } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Button, Field, FieldSet, Input, useStyles2 } from '@grafana/ui';
import { testIds } from '../testIds';

type AppPluginSettings = {
  systemPrompt?: string;
  payloadRegex?: string;
};

type State = {
  systemPrompt: string;
  payloadRegex: string;
};

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AppPluginSettings>> { }

const AppConfig = ({ plugin }: AppConfigProps) => {
  const s = useStyles2(getStyles);
  const { enabled, pinned, jsonData } = plugin.meta;
  const [state, setState] = useState<State>({
    systemPrompt: jsonData?.systemPrompt || 'You are a helpful assistant with deep knowledge of System Center Operations Manager, Grafana, telemetry and monitoring. When given a grafana dashboard panel json string you are able to explain what telemetry it is and what it represents.',
    payloadRegex: jsonData?.payloadRegex || ''
  });

  const isSubmitDisabled = Boolean(!state.systemPrompt);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      [event.target.name]: event.target.value,
    });

    console.log(state);
  };

  const onSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    updatePluginAndReload(plugin.meta.id, {
      enabled,
      pinned,
      jsonData: {
        systemPrompt: state.systemPrompt,
        payloadRegex: state.payloadRegex
      },
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      <FieldSet label="API Settings">
        <Field label="System Prompt" description="A prompt given to the AI Assistant">
          <Input
            width={60}
            id="config-system-prompt"
            data-testid={testIds.appConfig.systemPrompt}
            name="systemPrompt"
            value={state.systemPrompt}
            placeholder={'Your AI Assistant prompt'}
            onChange={onChange}
          />
        </Field>
        <Field label="Payload Regex" description="A regular expression to apply to the content payload when describing a dashboard. This can significantly reduce response times">
          <Input
            width={60}
            id="config-payload-regex"
            data-testid={testIds.appConfig.payloadRegex}
            name="payloadRegex"
            value={state.payloadRegex}
            placeholder={''}
            onChange={onChange}
          />
        </Field>
        <div className={s.marginTop}>
          <Button type="submit" data-testid={testIds.appConfig.submit} disabled={isSubmitDisabled}>
            Save settings
          </Button>
        </div>
      </FieldSet >
    </form >
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  colorWeak: css`
    color: ${theme.colors.text.secondary};
  `,
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
});

const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta<AppPluginSettings>>) => {
  try {
    await updatePlugin(pluginId, data);

    // Reloading the page as the changes made here wouldn't be propagated to the actual plugin otherwise.
    // This is not ideal, however unfortunately currently there is no supported way for updating the plugin state.
    window.location.reload();
  } catch (e) {
    console.error('Error while updating the plugin', e);
  }
};

const updatePlugin = async (pluginId: string, data: Partial<PluginMeta>) => {
  const response = await getBackendSrv().fetch({
    url: `/api/plugins/${pluginId}/settings`,
    method: 'POST',
    data,
  });

  return lastValueFrom(response);
};
