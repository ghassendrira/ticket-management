param(
    [string]$ConversationBaseUrl = 'http://localhost:8091/api',
    [string]$Token = $env:TICKETFLOW_TEST_TOKEN
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw 'Set TICKETFLOW_TEST_TOKEN to a valid JWT before running this test.'
}

$headers = @{ Authorization = "Bearer $Token" }
$jsonHeaders = @{
    Authorization = "Bearer $Token"
    'Content-Type' = 'application/json'
}

function Invoke-JsonRequest {
    param(
        [string]$Uri,
        [string]$Method,
        [hashtable]$Headers,
        [object]$Body
    )

    $request = @{
        Uri = $Uri
        Method = $Method
        Headers = $Headers
    }
    if ($null -ne $Body) {
        $request.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    return Invoke-RestMethod @request
}

$conversation = Invoke-JsonRequest `
    -Uri "$ConversationBaseUrl/conversations" `
    -Method Post `
    -Headers $jsonHeaders `
    -Body @{}

$message = Invoke-JsonRequest `
    -Uri "$ConversationBaseUrl/conversations/$($conversation.id)/messages" `
    -Method Post `
    -Headers $jsonHeaders `
    -Body @{ role = 'USER'; content = 'Mon paiement a ete debite deux fois et je demande un remboursement urgent aujourd hui.' }

$escalation = Invoke-JsonRequest `
    -Uri "$ConversationBaseUrl/conversations/$($conversation.id)/escalate" `
    -Method Post `
    -Headers $jsonHeaders `
    -Body @{
        title = 'Paiement debite deux fois'
        summary = 'Le paiement a ete debite deux fois. Remboursement urgent demande.'
        description = 'Le paiement a ete debite deux fois. Remboursement urgent demande.'
        conversationId = $conversation.id
        requestId = "E2E-$($conversation.id)"
    }

$history = Invoke-JsonRequest `
    -Uri "$ConversationBaseUrl/conversations" `
    -Method Get `
    -Headers $headers

if ($history.Count -eq 0 -or $history[0].id -ne $conversation.id) {
    throw "Escalated conversation was not first in history. Expected $($conversation.id)."
}

Write-Host "PASS: conversation $($conversation.id) is first in history after escalation."
Write-Host "Ticket reference: $($escalation.ticketId)"
