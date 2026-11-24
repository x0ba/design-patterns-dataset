<?php
/**
 * Local stub for the external services Typemill calls server-side (via Models/ApiCalls.php,
 * which rewrites https://<host>/<path> to http://127.0.0.1:4492/<host>/<path> when
 * TYPEMILL_SERVICE_STUB_URL is set).
 *
 *  - typemill.net / plugins.typemill.net / themes.typemill.net : version checks
 *  - service.typemill.net : license service (answers "no license", the free edition)
 *  - api.openai.com / api.anthropic.com : AI assistant "Kixote"
 */
header('Content-Type: application/json');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];

function out($data, $status = 200) { http_response_code($status); echo json_encode($data); exit; }

function aiReply(array $body): string
{
    $msgs = $body['messages'] ?? [];
    $last = '';
    foreach ($msgs as $m) {
        $c = $m['content'] ?? '';
        if (is_array($c)) { $c = implode("\n", array_map(fn($b) => $b['text'] ?? '', $c)); }
        if (($m['role'] ?? '') === 'user') { $last = $c; }
    }
    if ($last === '' && isset($body['input'])) { $last = is_string($body['input']) ? $body['input'] : json_encode($body['input']); }
    $text = trim(strip_tags($last));
    // pull out the article content if it is tagged, otherwise use the whole message
    if (preg_match('#<content>(.*)</content>#s', $last, $m)) { $text = trim($m[1]); }
    $sentences = preg_split('/(?<=[.!?])\s+/', preg_replace('/\s+/', ' ', $text));
    $sentences = array_values(array_filter($sentences, fn($s) => strlen($s) > 20));
    $summary = implode(' ', array_slice($sentences, 0, 3));
    if ($summary === '') {
        return "Sure. Could you tell me which page or paragraph you want me to work on? Select a block in the editor and I'll revise it for clarity, shorten it, or translate it.";
    }
    return "Here is a tighter version of the selected text:\n\n" . $summary .
        "\n\nI removed repeated phrasing, kept the product terms exactly as they appear in your docs, and split long sentences so the steps are easier to scan.";
}

switch (true) {
    case str_starts_with($path, '/typemill.net/api/v1/checkversion'):
        out(['system' => ['typemill' => '2.28.2']]);

    case str_starts_with($path, '/plugins.typemill.net/api/v1/getplugins'):
        out(['plugins' => ['demo' => ['version' => '1.0.0', 'name' => 'Demo', 'url' => 'https://plugins.typemill.net/demo']]]);

    case str_starts_with($path, '/themes.typemill.net/api/v1/getthemes'):
        out(['themes' => ['cyanine' => ['version' => '2.5.1', 'name' => 'Cyanine', 'url' => 'https://themes.typemill.net/cyanine']]]);

    case str_starts_with($path, '/service.typemill.net/'):
        out(['code' => 'nolicense', 'message' => 'No license found for this domain.'], 404);

    case str_ends_with($path, '/models'):
        if (str_contains($path, 'anthropic')) {
            out(['data' => [
                ['type' => 'model', 'id' => 'claude-sonnet-5-5', 'display_name' => 'Claude Sonnet 5.5'],
                ['type' => 'model', 'id' => 'claude-haiku-5-5', 'display_name' => 'Claude Haiku 5.5'],
            ]]);
        }
        out(['object' => 'list', 'data' => [
            ['id' => 'gpt-4.1-mini', 'object' => 'model', 'owned_by' => 'openai'],
            ['id' => 'gpt-4.1', 'object' => 'model', 'owned_by' => 'openai'],
        ]]);

    case str_ends_with($path, '/chat/completions'):
        $reply = aiReply($body);
        out(['id' => 'chatcmpl-local' . substr(md5($reply), 0, 10), 'object' => 'chat.completion', 'created' => time(),
             'model' => $body['model'] ?? 'gpt-4.1-mini',
             'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $reply], 'finish_reason' => 'stop']],
             'usage' => ['prompt_tokens' => 812, 'completion_tokens' => 146, 'total_tokens' => 958]]);

    case str_ends_with($path, '/responses'):
        $reply = aiReply($body);
        out(['id' => 'resp_local', 'object' => 'response', 'status' => 'completed', 'model' => $body['model'] ?? 'gpt-4.1-mini',
             'output' => [['type' => 'message', 'role' => 'assistant', 'content' => [['type' => 'output_text', 'text' => $reply]]]],
             'usage' => ['input_tokens' => 812, 'output_tokens' => 146, 'total_tokens' => 958]]);

    case str_ends_with($path, '/messages'):
        $reply = aiReply($body);
        out(['id' => 'msg_local', 'type' => 'message', 'role' => 'assistant', 'model' => $body['model'] ?? 'claude-sonnet-5-5',
             'content' => [['type' => 'text', 'text' => $reply]], 'stop_reason' => 'end_turn',
             'usage' => ['input_tokens' => 812, 'output_tokens' => 146]]);
}
out(['error' => ['message' => 'Unknown endpoint in local stub: ' . $path]], 404);
