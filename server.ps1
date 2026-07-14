$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:4000/')
$listener.Start()
Write-Host 'Server running at http://127.0.0.1:4000/'

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.js' = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.ico' = 'image/x-icon'
    '.svg' = 'image/svg+xml'
    '.woff' = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf' = 'font/ttf'
    '.xml' = 'application/xml; charset=utf-8'
    '.map' = 'application/json; charset=utf-8'
    '.eot' = 'application/vnd.ms-fontobject'
}

$root = 'd:/Programs'

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response
    $requestUrl = $context.Request.Url.LocalPath

    if ($requestUrl -eq '/') { $requestUrl = '/blog/index.html' }
    
    $filePath = Join-Path $root $requestUrl.TrimStart('/')

    # If path is a directory, try index.html
    if (Test-Path $filePath -PathType Container) {
        $filePath = Join-Path $filePath 'index.html'
    }
    
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath)
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        
        $buffer = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $contentType
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $response.ContentType = 'text/plain; charset=utf-8'
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
