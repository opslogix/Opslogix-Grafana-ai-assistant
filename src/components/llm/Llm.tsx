import React, { useEffect, useState } from 'react';
import { useAsyncFn } from 'react-use';
import { scan } from 'rxjs/operators';
import { llm } from '@grafana/llm';
import { Button, Input, Spinner, Stack, Box, ScrollContainer } from '@grafana/ui';
import { flushSync } from 'react-dom';

interface LlmProps {
    //Usually the dashboard/panel
    context?: any;
}

interface Message {
    role: 'system' | 'assistant' | 'user';
    content?: string;
    tool_call_id?: string;
    name?: string;
    function_call?: Object;
}

const Llm = (props: LlmProps) => {
    const systemMessage = 'You are a helpful assistant with deep knowledge of System Center Operations Manager, Grafana, telemetry and monitoring. When given a grafana dashboard panel json string you are able to explain what telemetry it is and what it represents.';

    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: systemMessage },
    ]);

    const [input, setInput] = useState('');
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(false);

    // Function to ask a new question
    const [{ error }, ask] = useAsyncFn(async (message: string) => {

        if (message === '') {
            return;
        }

        const enabled = await llm.enabled();
        if (!enabled) {
            return;
        }

        setReply(''); // reset live reply
        setInput(''); // reset input

        //I don't know why I have to do this
        flushSync(() => {
            setMessages((prev) => [...prev, { role: 'user', content: message }]);
        })

        setLoading(true);
        let temp = '';

        const stream = llm
            .streamChatCompletions({
                model: llm.Model.BASE,
                messages: [...messages, { role: 'user', content: message }],
            })
            .pipe(
                scan((acc, delta) => {
                    setLoading(false);
                    const chunk = delta as any;
                    const content = chunk.choices[0]?.delta?.content ?? '';
                    temp = acc + content;
                    return temp;
                }, '')
            )

        //Next is for streaming the response
        //Complete is adding the whole reply to the messages
        stream.subscribe({
            next: (v) => setReply(v),
            complete: () => {
                // Once stream is done, commit assistant’s reply to messages
                setMessages((prev) => [...prev, { role: 'assistant', content: temp }]);
            }
        })
    });

    useEffect(() => {
        console.log('loading changed', loading)
    }, [loading])

    useEffect(() => {
        if (!props.context) {
            return;
        }

        const content = JSON.stringify(props.context);

        const userMessage: Message = { role: 'user', content: content };
        setMessages(prev => [...prev, userMessage]);

        ask(content);
    }, [props.context, ask]);
    
    if (error) {
        console.error(error);
        return <></>;
    }

    return (
        <Stack direction={'column'}>
            <ScrollContainer>
                <Box flex={1} padding={2} width={"100%"}>
                    <Stack direction="column" gap={4}>
                        {
                            messages.filter((m) => m.role !== 'system' && messages.indexOf(m) !== messages.length - 1).map(msg => (
                                <Stack
                                    key={messages.indexOf(msg)}
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
                                        <pre style={{ border: 'none', backgroundColor: 'inherit', font: 'inherit', margin: 0, padding: 0 }}>{msg.content ?? ''}</pre>
                                    </Box>
                                </Stack>
                            ))}
                        <Stack
                            direction="row"
                            justifyContent={'flex-start'}
                            gap={1}>
                            <Box>
                                {loading ? <Spinner /> : <pre style={{ border: 'none', backgroundColor: 'inherit', font: 'inherit', margin: 0, padding: 0 }}>{reply}</pre>}
                            </Box>
                        </Stack>
                    </Stack>
                </Box>
                <Box>
                    <Stack direction="row" gap={4}>
                        <Input
                            disabled={loading}
                            value={input}
                            onKeyDown={(e) => e.key === 'Enter' ? ask(input) : false}
                            onChange={(e) => setInput(e.currentTarget.value)}
                            placeholder="Enter a message"
                        />
                        <Button type="submit" onClick={() => ask(input)}>
                            Send
                        </Button>
                    </Stack>
                </Box>
            </ScrollContainer>
        </Stack>
    );
};
// {
//     messages.filter((m) => m.role != 'system' && messages.indexOf(m) != messages.length - 1).map((msg) => (
//         <pre style={{ border: 'none' }}>{msg.role}: {msg.content}</pre>
//     ))
// }
// <pre style={{ border: 'none' }}>{loading ? <Spinner /> : reply}</pre>

export default Llm;
