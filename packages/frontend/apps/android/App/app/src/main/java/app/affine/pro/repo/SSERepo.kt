package app.affine.pro.repo

import app.affine.pro.BuildConfig
import app.affine.pro.service.OkHttp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.channels.trySendBlocking
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SSERepo @Inject constructor() {

    fun messageStream(sessionId: String, messageId: String) =
        "${BuildConfig.BASE_URL}/api/copilot/chat/$sessionId/stream?messageId=$messageId".eventSource()

    data class Event(val id: String?, val type: String?, val data: String)

    private val factory = EventSources.createFactory(OkHttp.client)

    private fun String.eventSource(): Flow<Result<Event>> {
        val request = Request.Builder()
            .get()
            .url(this)
            .build()
        return callbackFlow<Result<Event>> {
            factory.newEventSource(request, object : EventSourceListener() {
                override fun onClosed(eventSource: EventSource) {
                    channel.close()
                }

                override fun onEvent(
                    eventSource: EventSource,
                    id: String?,
                    type: String?,
                    data: String
                ) {
                    trySendBlocking(Result.success(Event(id, type, data)))
                }

                override fun onFailure(
                    eventSource: EventSource,
                    t: Throwable?,
                    response: Response?
                ) {
                    trySendBlocking(Result.failure(t ?: UnknownError("Unknown sse error.")))
                    channel.close(t)
                }
            })
            awaitClose()
        }.flowOn(Dispatchers.IO)
    }
}