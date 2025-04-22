package app.affine.pro

import android.content.res.ColorStateList
import android.view.Gravity
import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.content.ContextCompat
import androidx.core.view.updateMargins
import androidx.lifecycle.lifecycleScope
import app.affine.pro.ai.AIActivity
import app.affine.pro.plugin.AIButtonPlugin
import app.affine.pro.plugin.AffineThemePlugin
import app.affine.pro.plugin.AuthPlugin
import app.affine.pro.plugin.HashCashPlugin
import app.affine.pro.plugin.NbStorePlugin
import app.affine.pro.repo.WebRepo
import app.affine.pro.utils.dp
import com.getcapacitor.BridgeActivity
import com.google.android.material.floatingactionbutton.FloatingActionButton
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject


@AndroidEntryPoint
class MainActivity : BridgeActivity(), AIButtonPlugin.Callback, AffineThemePlugin.Callback,
    View.OnClickListener {

    @Inject
    lateinit var webRepo: WebRepo

    init {
        registerPlugins(
            listOf(
                AffineThemePlugin::class.java,
                AIButtonPlugin::class.java,
                AuthPlugin::class.java,
                HashCashPlugin::class.java,
                NbStorePlugin::class.java,
            )
        )
    }

    private val fab: FloatingActionButton by lazy {
        FloatingActionButton(this).apply {
            visibility = View.GONE
            layoutParams = CoordinatorLayout.LayoutParams(dp(52), dp(52)).apply {
                gravity = Gravity.END or Gravity.BOTTOM
                updateMargins(0, 0, dp(24), dp(86))
            }
            customSize = dp(52)
            setImageResource(R.drawable.ic_ai)
            setOnClickListener(this@MainActivity)
            val parent = bridge.webView.parent as CoordinatorLayout
            parent.addView(this)
        }
    }

    override fun present() {
        lifecycleScope.launch {
            fab.show()
        }
    }

    override fun dismiss() {
        lifecycleScope.launch {
            fab.hide()
        }
    }

    override fun onThemeChanged(darkMode: Boolean) {
        lifecycleScope.launch {
            fab.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(
                    this@MainActivity,
                    if (darkMode) {
                        R.color.layer_background_primary_dark
                    } else {
                        R.color.layer_background_primary
                    }
                )
            )
        }
    }

    override fun onClick(v: View) {
        lifecycleScope.launch {
            webRepo.init(bridge)
            AIActivity.open(this@MainActivity)
        }
    }

}
