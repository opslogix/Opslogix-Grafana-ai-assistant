import React, { useState } from 'react';
import { scan } from 'rxjs/operators';
import { llm } from '@grafana/llm';
import { Button, Input, Spinner, Stack, Box } from '@grafana/ui';
import { usePluginContext } from '@grafana/data';

interface LlmProps {
  context?: any;
}

interface Message {
  role: 'system' | 'assistant' | 'user' | 'tool';
  content?: string;
  tool_call_id?: string;
  name?: string;
  function_call?: Object;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  index?: number;
  type: 'function';
  function: FunctionCall;
}

interface FunctionCall {
  name: string;
  arguments: string;
}

interface Tool {
  type: 'function';
  function: Function;
  id?: string;
}

interface Function {
  name: string;
  description?: string;
  parameters?: Parameters;
}

interface Parameters {
  type: any;
  required: string[];
  properties: any;
}

const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_dashboard',
      description: 'Analyze a JSON representation of a grafana dashboard',
    },
  },
];

const Llm = (props: LlmProps) => {
  const pluginSettings = usePluginContext();
  const systemMessage =
    `${pluginSettings?.meta?.jsonData?.systemPrompt}` ||
    'You are a helpful assistant with deep knowledge telemetry and monitoring in general. When given a grafana dashboard panel json string you are able to explain what telemetry it is and what it represents.';

  const [currentMessages, setMessages] = useState<Message[]>([
    { role: 'system', content: systemMessage },
  ]);

  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const onUserChat = async (message: string) => {
    if (!message) {
      return;
    }

    setInput('');
    setReply('');
    setLoading(true);

    const userMessage: Message = { role: 'user', content: message };
    const newMessages: Message[] = [...currentMessages, userMessage];

    setMessages(newMessages);
    await chat(newMessages);
  };

  const chat = async (messages: Message[]) => {
    const enabled = await llm.enabled();
    if (!enabled) {
      setLoading(false);
      return;
    }

    let tempContent = '';
    let toolCalls: ToolCall[] | undefined;

    const stream = llm
      .streamChatCompletions({
        model: llm.Model.BASE,
        messages: messages,
        tools: tools,
      })
      .pipe(
        scan((acc, delta) => {
          const chunk = delta as any;
          const content = chunk.choices[0]?.delta?.content ?? '';
          tempContent = acc + content;
          toolCalls = chunk.choices[0]?.delta?.tool_calls;
          return tempContent;
        }, '')
      );

    stream.subscribe({
      error: (e) => {
        console.error('stream_error', e);
        setLoading(false);
      },
      next: (v) => {
        if (v) {
          setReply(v); // show streaming text
        }
      },
      complete: async () => {
        if (toolCalls) {
          // Handle tool calls
          const toolCallMsg: Message = {
            role: 'assistant',
            tool_calls: toolCalls,
          };

          const toolResultMsg: Message = {
            role: 'tool',
            tool_call_id: toolCalls[0].id,
            content: JSON.stringify(props.context),
          };

          await chat([...messages, toolCallMsg, toolResultMsg]);
        } else {
          // Finalize assistant response
          if (tempContent.trim() !== '') {
            setMessages([...messages, { role: 'assistant', content: tempContent }]);
          }
          setReply('');
          setLoading(false);
        }
      },
    });
  };

  return (
    <Stack direction={'column'}>
      <Box flex={1} padding={2} width={'100%'}>
        <Stack direction="column" gap={4}>
          {currentMessages
            .filter((m) => m.role !== 'system' && m.role !== 'tool')
            .map((msg, i) => (
              <Stack
                key={i}
                direction="row"
                justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                gap={1}
              >
                <Box
                  padding={2}
                  alignItems={'flex-end'}
                  backgroundColor={msg.role === 'user' ? 'secondary' : 'primary'}
                  maxWidth={'70%'}
                >
                  <pre
                    style={{
                      border: 'none',
                      backgroundColor: 'inherit',
                      font: 'inherit',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {msg.content ?? ''}
                  </pre>
                </Box>
              </Stack>
            ))}

          {/* Live streaming reply */}
          {loading && (
            <Stack direction="row" justifyContent={'flex-start'} gap={1}>
              <Box>
                {reply ? (
                  <pre
                    style={{
                      border: 'none',
                      backgroundColor: 'inherit',
                      font: 'inherit',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {reply}
                  </pre>
                ) : (
                  <Spinner />
                )}
              </Box>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Input box */}
      <Box>
        <Stack direction="row" gap={4}>
          <Input
            disabled={loading}
            value={input}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUserChat(input);
              }
            }}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Enter a message"
          />
          <Button disabled={loading} type="submit" onClick={() => onUserChat(input)}>
            Send
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export default Llm;
