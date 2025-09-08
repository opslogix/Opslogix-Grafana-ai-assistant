import React from 'react';
import { testIds } from '../components/testIds';
import { PluginPage } from '@grafana/runtime';
import Llm from 'components/llm/Llm';

function PageTwo() {

  return (
    <PluginPage>
      <div data-testid={testIds.pageTwo.container}>
        <p>This is page two.</p>
        <Llm></Llm>
      </div>
    </PluginPage>
  );
}

export default PageTwo;
